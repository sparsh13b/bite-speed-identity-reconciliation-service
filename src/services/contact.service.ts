import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function handleIdentify(email: string | null, phoneNumber: string | null) {

    // ──────────────────────────────────────────────────
    // STEP 1: Searching in the database for any contactsthat have the same email OR same phone number details.
    // ──────────────────────────────────────────────────
    const filters = [];
    if (email) filters.push({ email });
    if (phoneNumber) filters.push({ phoneNumber });

    const matches = await prisma.contact.findMany({
        where: { OR: filters },
        orderBy: { createdAt: "asc" },
    });

    // ──────────────────────────────────────────────────
    // STEP 2: If no matches found it means they are new customer.
    // ──────────────────────────────────────────────────
    if (matches.length === 0) {
        const created = await prisma.contact.create({
            data: {
                email,
                phoneNumber,
                linkPrecedence: "primary",
            },
        });

        return {
            contact: {
                primaryContactId: created.id,
                emails: email ? [email] : [],
                phoneNumbers: phoneNumber ? [phoneNumber] : [],
                secondaryContactIds: [],
            },
        };
    }

    // ──────────────────────────────────────────────────
    // STEP 3: If we got matches then we figure out which "primary" contact(s) they belong to.
    // ──────────────────────────────────────────────────
    // A matched contact could be a primary or a secondary.
    // If it's a secondary, its `linkedId` tells us who the primary is.
    // We collect all unique primary IDs.
    //
    // Example: if we matched contact {id:23, linkedId:1, linkPrecedence:"secondary"}
    //       then the primary is contact with id=1

    const rootIds = new Set<number>();

    for (const c of matches) {
        if (c.linkPrecedence === "primary") {
            rootIds.add(c.id);
        } else {
            // It's a secondary → its primary is the one it's linked to
            rootIds.add(c.linkedId!);
        }
    }

    // we fetch  the actual primary contact rows from DB
    const rootContacts = await prisma.contact.findMany({
        where: { id: { in: Array.from(rootIds) } },
        orderBy: { createdAt: "asc" }, // oldest first, as this is imp to declare first primary as root primary later!
    });

    // The oldest primary is the "winner" — it stays primary
    let root = rootContacts[0];

    // ──────────────────────────────────────────────────
    // STEP 4: If there are 2+ primaries, MERGE them
    // ──────────────────────────────────────────────────
    //
    // This happens when: email matches Group A, phone matches Group B,
    // and they were previously unrelated. Now we know they're the same person.
    //
    // Rule: The older primary stays "primary".
    //       The newer primary becomes "secondary" (linked to the older one).
    //       all contacts that were linked to the newer primary
    //       get re-linked to the older primary.

    if (rootContacts.length > 1) {
        for (let i = 1; i < rootContacts.length; i++) {
            const olderEntry = rootContacts[i];

            // turns the newer primary into a secondary
            await prisma.contact.update({
                where: { id: olderEntry.id },
                data: {
                    linkedId: root.id,
                    linkPrecedence: "secondary",
                },
            });

            // all contacts that pointed to the newer primary(children of previous secondary)
            // now need to point to the older primary instead.
            await prisma.contact.updateMany({
                where: { linkedId: olderEntry.id },
                data: { linkedId: root.id },
            });
        }
    }

    // ──────────────────────────────────────────────────
    // STEP 5: get all contacts in this linked group
    // ──────────────────────────────────────────────────
    //
    // merging logic is done, now we just need to return the final response
    // as primary or secondary details for every customer.

    let group = await prisma.contact.findMany({
        where: {
            OR: [
                { id: root.id },       // the primary itself
                { linkedId: root.id },  // all secondaries linked to it
            ],
        },
        orderBy: { createdAt: "asc" },
    });

    // ──────────────────────────────────────────────────
    // STEP 6: Does this request bring any new information?
    // ──────────────────────────────────────────────────
    //
    // we check here if the email or phone from the request is something
    // we haven't seen before in this group.
    // If yes then we  create a new secondary contact with that info.
    //
    // Example: if out group has email "a@b.com" + phone "123"
    //          Request comes with email "x@y.com" + phone "123"
    //          then "x@y.com" is new! Create a secondary for it.

    const knownEmails = group.map((c) => c.email);
    const knownPhones = group.map((c) => c.phoneNumber);

    const isNewEmail = email && !knownEmails.includes(email);
    const isNewPhone = phoneNumber && !knownPhones.includes(phoneNumber);

    if (isNewEmail || isNewPhone) {
        await prisma.contact.create({
            data: {
                email,
                phoneNumber,
                linkedId: root.id,
                linkPrecedence: "secondary",
            },
        });

        // Re-fetch so the new contact shows up in our list
        group = await prisma.contact.findMany({
            where: {
                OR: [
                    { id: root.id },
                    { linkedId: root.id },
                ],
            },
            orderBy: { createdAt: "asc" },
        });
    }

    // ──────────────────────────────────────────────────
    // STEP 7: after all of these checks we build the final response
    // ──────────────────────────────────────────────────
    //
    // collects unique emails and phones (primary's first),
    // and list all secondary contact IDs.

    const emailList: string[] = [];
    const phoneList: string[] = [];

    for (const c of group) {
        if (c.email && !emailList.includes(c.email)) {
            emailList.push(c.email);
        }
        if (c.phoneNumber && !phoneList.includes(c.phoneNumber)) {
            phoneList.push(c.phoneNumber);
        }
    }

    const childIds = group
        .filter((c) => c.id !== root.id)
        .map((c) => c.id);

    return {
        contact: {
            primaryContactId: root.id,
            emails: emailList,
            phoneNumbers: phoneList,
            secondaryContactIds: childIds,
        },
    };
}
