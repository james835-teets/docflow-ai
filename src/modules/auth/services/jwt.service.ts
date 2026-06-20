import jwt, { type SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
}

export class JwtService {
  private readonly signOptions: SignOptions;

  constructor(
    private readonly secret: string,
    expiresIn: string,
  ) {
    this.signOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, this.signOptions);
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }
}
