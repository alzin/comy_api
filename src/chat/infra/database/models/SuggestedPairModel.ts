   // File: src/chat/infra/database/models/SuggestedPairModel.ts
   import mongoose, { Schema, Document } from 'mongoose';

   export interface ISuggestedPair extends Document {
     userId: mongoose.Types.ObjectId;
     suggestedUserId: mongoose.Types.ObjectId;
     status: 'pending' | 'sent' | 'rejected';
     createdAt: Date;
   }

   const SuggestedPairSchema = new mongoose.Schema<ISuggestedPair>({
     userId: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
     suggestedUserId: { type: mongoose.SchemaTypes.ObjectId, ref: 'User', required: true },
     status: { type: String, enum: ['pending', 'sent', 'rejected'], default: 'pending' },
     createdAt: { type: Date, default: Date.now },
   });

   export default mongoose.model<ISuggestedPair>('SuggestedPair', SuggestedPairSchema);