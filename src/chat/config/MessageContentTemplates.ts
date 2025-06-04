interface MessageTemplate {
  text: string;
  images?: Array<{ imageUrl: string; zoomLink: string }>;
}

interface MessageTemplates {
  [key: string]: MessageTemplate;
}

export const messageTemplates: MessageTemplates = {
  // GenerateBotResponseUseCase templates
  bot1Response: {
    text: 'COMY オフィシャル AI: Thanks for your message "${content}"! How can I assist you today?',
  },
  bot2Response: {
    text: 'COMY オフィシャル AI: こんにちは！ "${content}" についてもっと教えてください！',
  },

  // RespondToMatchUseCase templates
  matchRejected: {
    text: 'マッチングを却下しました。${senderName}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。',
  },
  matchRejectedFollowUp1: {
    text: 'お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。',
  },
  matchRejectedFollowUp2: {
    text: '月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。',
  },
  matchRejectedImages: {
    text: '',
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', zoomLink: 'https://zoom.us/j/business-sheet-meeting' },
      { imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470', zoomLink: 'https://zoom.us/j/virtual-meeting' },
    ],
  },
  matchAcceptedConfirmation: {
    text: '${suggestedUserName}さんとのビジネスマッチができました。チャットで挨拶してみましょう。',
  },
  matchGroupIntro1: {
    text: '${userName}さん、お世話になっております！こちら${suggestedUserCategory}カテゴリーの${suggestedUserName}さんをご紹介します！${suggestedUserCategory}カテゴリーの${suggestedUserName}さんの強みは“自社の強みテーブル”です！',
  },
  matchGroupIntro2: {
    text: '${suggestedUserName}さん、お世話になっております！こちら${userCategory}カテゴリーの${userName}さんをご紹介します！${userCategory}カテゴリーの${userName}さんの強みは”自社の強みテーブル”です！',
  },
  matchGroupIntro3: {
    text: '是非お二人でお話をしてみてください！',
  },
  matchNotification: {
    text: '${userName}さんとのビジネスマッチができました。チャットで挨拶してみましょう！',
  },

  // RespondToSuggestionUseCase templates
  suggestionRejected: {
    text: 'マッチングを却下しました。${senderName}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。',
  },
  suggestionRejectedFollowUp1: {
    text: 'お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。',
  },
  suggestionRejectedFollowUp2: {
    text: '月曜日の20:00と水曜日の11:00からオンラインでの交流会も行っているのでそちらもご利用ください。',
  },
  suggestionRejectedImages: {
    text: '',
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', zoomLink: 'https://zoom.us/j/business-sheet-meeting' },
      { imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470', zoomLink: 'https://zoom.us/j/virtual-meeting' },
    ],
  },
  suggestionAcceptedConfirmation: {
    text: '${suggestedUserName}さんにマッチの希望を送りました。',
  },
  suggestionMatchRequest: {
    text: '${suggestedUserName}さん、おはようございます！\n${suggestedUserName}さんに${userCategory}カテゴリーの${senderName}さんからマッチの希望が届いています。\nお繋がりを希望しますか？',
  },

  // chatRoutes.ts templates (send-suggested-friend)
  suggestedFriendIntro: {
    text: '${userName}さん、おはようございます！今週は${userName}さんにおすすめの方で${suggestedUserCategory}カテゴリーの${suggestedUserName}さんをご紹介します！\n${suggestedUserCategory}カテゴリーの${suggestedUserName}さんの強みは「自社の強みテーブル」です。\nお繋がり希望しますか？',
  },
};

// Utility function to replace placeholders in text
export function getTemplatedMessage(key: string, replacements: { [key: string]: string }): MessageTemplate {
  const template = messageTemplates[key];
  if (!template) {
    console.error(`Template ${key} not found`);
    throw new Error(`Template ${key} not found`);
  }
  let text = template.text;
  console.log(`Template ${key} before replacement: ${text}`);
  console.log(`Replacements: ${JSON.stringify(replacements)}`);

  // Use regex to replace ${placeholder} with value
  for (const [placeholder, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\$\\{${placeholder}\\}`, 'g');
    text = text.replace(regex, value || '');
  }

  console.log(`Template ${key} after replacement: ${text}`);
  return { text, images: template.images };
}