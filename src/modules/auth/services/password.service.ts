import bcrypt from 'bcrypt';

export class PasswordService {
  constructor(private readonly rounds: number) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
