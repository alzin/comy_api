export default {
    port: process.env.PORT || 3000,
    url: process.env.BASE_URL || "http://localhost:3000/",
    node: process.env.NODE_ENV || "dev",
    email: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    secret: process.env.JWT_SECRET || "",
    expireIn: process.env.JWT_EXPIRES_IN || "1h",
    stripeKey: process.env.STRIPE_SECRET_KEY || "",
    devMongoUri: process.env.DEV_MONGODB_URI,
    prodMongoUri: process.env.PROD_MONGODB_URI,
    terms: process.env.TERMS_URL
}