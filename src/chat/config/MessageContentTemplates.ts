///src/chat/config/MessageContentTemplates.ts
interface MessageTemplate {
  text: string;
  images?: Array<{ imageUrl: string; zoomLink: string }>;
}

interface MessageTemplates {
  [key: string]: MessageTemplate;
}

export const messageTemplates: MessageTemplates = {
  // GenerateBotResponseUseCase templates

  bot2Response: {
    text: 'CONFIG.BOT_NAME: こんにちは！ "${content}" についてもっと教えてください！',
  },

  // RespondToMatchUseCase templates
  matchRejected: {
    text: 'マッチングを却下しました。${senderName}さんのビジネスに合ったマッチングをご希望の場合は、ビジネスシートのブラッシュアップをしてください。',
  },
  matchRejectedFollowUp1: {
    text: 'お手伝いが必要な場合は是非月曜日の21:00からのビジネスシートアップデート勉強会にご参加ください。',
  },
  matchRejectedFollowUp2: {
    text: '月曜日の20:00からオンラインでの交流会も行っているのでそちらもご利用ください。',
  },
  matchRejectedImages: {
    text: '',
    images: [
      { imageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/study-session.jpg', zoomLink: 'https://us06web.zoom.us/j/6910311031?pwd=2mPYwMkjvjOEamaT3X8F6pbmH9gJgV.1' },
      { imageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/networking-event.jpg', zoomLink: 'https://us06web.zoom.us/j/6910311031?pwd=2mPYwMkjvjOEamaT3X8F6pbmH9gJgV.1' },
    ],
  },
  matchAcceptedConfirmation: {
    text: '${suggestedUserName}さんとのビジネスマッチができました。チャットで挨拶してみましょう。',
  },
  matchGroupIntro1: {
    text: '${userName}さん、お世話になっております！こちら${suggestedUserCategory}カテゴリーの${suggestedUserName}さんをご紹介します！${suggestedUserCategory}カテゴリーの${suggestedUserName}さんの強みは ${suggestedUserCompanyStrengths} です！',
  },
  matchGroupIntro2: {
    text: '${suggestedUserName}さん、お世話になっております！こちら${userCategory}カテゴリーの${userName}さんをご紹介します！${userCategory}カテゴリーの${userName}さんの強みは ${userCompanyStrengths} です！',
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
    text: '月曜日の20:00からオンラインでの交流会も行っているのでそちらもご利用ください。',
  },
  suggestionRejectedImages: {
    text: '',
    images: [
      { imageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/study-session.jpg', zoomLink: 'https://us06web.zoom.us/j/6910311031?pwd=2mPYwMkjvjOEamaT3X8F6pbmH9gJgV.1' },
      { imageUrl: 'https://comy-test.s3.ap-northeast-1.amazonaws.com/networking-event.jpg', zoomLink: 'https://us06web.zoom.us/j/6910311031?pwd=2mPYwMkjvjOEamaT3X8F6pbmH9gJgV.1' },
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
    text: '${userName}さん、おはようございます！今週は${userName}さんにおすすめの方で${suggestedUserCategory}カテゴリーの${suggestedUserName}さんをご紹介します！\n${suggestedUserCategory}カテゴリーの${suggestedUserName}さんの強みは ${companyStrengths}です。\nお繋がり希望しますか？',
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