import mongoose, { Schema, Document } from 'mongoose';

export interface IWebsiteSection extends Document {
    sectionType: 'HERO_PRODUCT' | 'SELECT_CATEGORY' | 'HERO_IMAGE' | 'SHOP_BY_CATEGORY' | 'BUSINESS_GALLERY' | 'HASHTAG_SECTION' | 'PRODUCT_DETAIL';
    title?: string;
    trader?: Schema.Types.ObjectId;
    product?: Schema.Types.ObjectId;
    categories?: Schema.Types.ObjectId[];
    images: string[];
    isNeedToShowTree?: boolean;
    tags?: string[];
    order: number;
    active: boolean;
    isDeleted: boolean;
    deletedAt?: Date;
}

const WebsiteSectionSchema: Schema = new Schema(
    {
        sectionType: {
            type: String,
            required: true,
            enum: ['HERO_PRODUCT', 'SELECT_CATEGORY', 'HERO_IMAGE', 'SHOP_BY_CATEGORY', 'BUSINESS_GALLERY', 'HASHTAG_SECTION', 'PRODUCT_DETAIL']
        },
        title: { type: String },
        trader: { type: Schema.Types.ObjectId, ref: 'Trader' },
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
        images: [{ type: String }],
        isNeedToShowTree: { type: Boolean, default: false },
        tags: [{ type: String }],
        order: { type: Number, required: true, default: 0 },
        active: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date }
    },
    { timestamps: true }
);

WebsiteSectionSchema.index({ sectionType: 1, isDeleted: 1, active: 1, order: 1 });

export default mongoose.model<IWebsiteSection>('WebsiteSection', WebsiteSectionSchema);
