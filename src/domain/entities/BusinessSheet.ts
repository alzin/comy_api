export interface BusinessSheet {
  id?: string;
  userId: string;
  shortBiography: string;
  businessDescription: string;
  personalInformation: string;
  goals: string;
  accomplishments: string;
  interests: string;
  networks: string;
  skills: string;
  goldenEgg: string[];
  goldenGoose: string[];
  goldenFarmer: string[];
  companyStrengths: string;
  powerWords: string[];
  itemsProducts: string[];
  fontPreference: string;
  colorPreference: string;
  sharingUrl: string;
  sharingQrCode: string;
  headerBackgroundImageUrl?: string;
  profileImageUrl?: string;
  referralSheetBackgroundImageUrl?: string;
}
