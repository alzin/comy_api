// src/domain/entities/BusinessSheet.ts

export interface BusinessSheet {
  id?: string; 
  userId: string;

  // 1. Member Profile
  memberProfile: {
    shortBiography: string; // Up to 400 characters
  };

  // 2. Business Information
  businessInformation: {
    businessDescription: string; // Up to 400 characters
  };

  // 3. Personal Information
  personalInformation: string; // Up to 200 characters

  // 4. Goals
  goals: string; // Up to 1000 characters

  // 5. Accomplishments
  accomplishments: string; // Up to 1000 characters

  // 6. Interests
  interests: string; // Up to 1000 characters

  // 7. Networks
  networks: string; // Up to 1000 characters

  // 8. Skills
  skills: string; // Up to 1000 characters

  // Additional Sections
  goldenFarmer: {
    fields: string[]; // Three fields, each up to 10 characters
  };

  goldenGoose: {
    fields: string[]; // Three fields, each up to 40 characters
  };

  companyStrengths: string; // Up to 1000 characters

  powerWords: {
    fields: string[]; // Three fields, each up to 10 characters
  };

  itemsProducts: {
    fields: string[]; // Three fields, each up to 40 characters
  };

  // Customization Information
  customization: {
    fontPreference: string;
    colorPreference: string;
  };

  // Sharing Information
  sharingInformation: {
    url: string;
    qrCode: string;
  };

  // Images
  headerBackgroundImageUrl?: string;
  profileImageUrl?: string;
  referralSheetBackgroundImageUrl?: string;
}
