import { fakerJA as faker } from '@faker-js/faker';
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { SubscriptionStatus } from "../src/domain/entities/SubscriptionStatus";
import { BusinessSheetDocument, BusinessSheetModel } from "../src/infra/database/models/BusinessSheetModel";
import { UserDocument, UserModel } from "../src/infra/database/models/UserModel";
import { startServer } from "../src/main/server";
import connectToDatabase from '../src/infra/database/database';

import fs from 'fs';
import path from 'path';

const main = async () => {
    try {
        await connectToDatabase();
        await startServer();
    } catch (error) {
        console.error("Failed to start the application:", error);
        process.exit(1);
    }
}

const storeDataInJson = async (filename: string, dataObject: any) => {
    const filePath = path.join(__dirname, filename);

    let data: any[] = [];

    // Read existing data if file exists
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        try {
            data = JSON.parse(fileContent);
        } catch (err) {
            console.error(`Failed to parse existing JSON in ${filename}:`, err);
        }
    }

    // Push new data
    data.push(dataObject);

    // Write updated data back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    console.log("Store data in :", filename)
};


const generateRandomUser = async (): Promise<{ user: UserDocument; plainPassword: string }> => {
    const plainPassword = faker.internet.password();

    const user = new UserModel({
        email: faker.internet.email(),
        name: `${faker.person.lastName()} ${faker.person.firstName()}`,
        category: faker.commerce.department(),
        profileImageUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
        password: await bcrypt.hash(plainPassword, 10),
        isEmailVerified: faker.datatype.boolean(),
        verificationToken: faker.string.uuid(),
        stripeCustomerId: faker.string.uuid(),
        stripeSubscriptionId: faker.string.uuid(),
        subscriptionStatus: faker.helpers.arrayElement(Object.values(SubscriptionStatus)),
        currentPeriodEnd: faker.date.future(),
        subscriptionPlan: faker.helpers.arrayElement(['basic', 'pro', 'enterprise']),
    });

    return { user, plainPassword };
};

const generateRandomBusinessSheet = (userId: mongoose.Types.ObjectId): BusinessSheetDocument => {
    return new BusinessSheetModel({
        userId,
        shortBiography: faker.lorem.paragraph(),
        businessDescription: faker.company.catchPhrase(),
        personalInformation: faker.lorem.sentence(),
        goals: faker.lorem.paragraphs(),
        accomplishments: faker.lorem.paragraphs(),
        interests: faker.lorem.paragraphs(),
        networks: faker.lorem.paragraphs(),
        skills: faker.lorem.paragraphs(),
        goldenEgg: Array.from({ length: 3 }, () => faker.word.noun()),
        goldenGoose: Array.from({ length: 3 }, () => faker.company.buzzPhrase()),
        goldenFarmer: Array.from({ length: 3 }, () => faker.word.adjective()),
        companyStrengths: faker.lorem.paragraphs(),
        powerWords: Array.from({ length: 6 }, () => faker.word.adjective()),
        itemsProducts: Array.from({ length: 3 }, () => faker.commerce.productName()),
        fontPreference: faker.helpers.arrayElement(['Arial', 'Helvetica', 'Times New Roman', 'Courier', 'Verdana']),
        colorPreference: faker.color.rgb(),
        sharingUrl: faker.internet.url(),
        sharingQrCode: faker.image.dataUri(),
        headerBackgroundImageUrl: `https://picsum.photos/1200/400?random=${Math.floor(Math.random() * 1000)}`,
        profileImageUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
        referralSheetBackgroundImageUrl: `https://picsum.photos/1200/800?random=${Math.floor(Math.random() * 1000)}`,
    });
};

const generateDummyData = async (count: number) => {
    for (let i = 0; i < count; i++) {
        try {
            const { user, plainPassword } = await generateRandomUser();
            await user.save();

            await storeDataInJson("users.json", {
                ...user.toObject(),
                password: plainPassword,
            });

            const businessSheet = generateRandomBusinessSheet(user._id);
            await businessSheet.save();

            await storeDataInJson("businessSheets.json", businessSheet.toObject());

            console.log(`Generated user and business sheet ${i + 1}/${count}`);
        } catch (error) {
            console.error(`Error generating dummy data: ${error}`);
        }
    }
};


main().then(() => {
    generateDummyData(50)
        .then(() => {
            console.log('Dummy data generation completed');
            mongoose.disconnect();
        })
        .catch((error) => {
            console.error('Error in dummy data generation:', error);
            mongoose.disconnect();
        });
})
