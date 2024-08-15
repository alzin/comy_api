interface User {
  email: string;
  name: string;
  password: string;
  isVerified: boolean;
  verificationToken: string;
}

export default User;
