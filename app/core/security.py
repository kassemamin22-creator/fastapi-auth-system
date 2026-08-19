"""Password hashing utilities used at registration (hash) and login (verify)."""

from passlib.context import CryptContext

# bcrypt automatically salts each hash, so two users with the same password
# still get different hashed_password values in storage.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plaintext password for storage as `UserModel.hashed_password`.

    Called when a user registers (or an admin creates a user, or a password
    is changed) — the plaintext password itself is never stored.
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a login attempt's plaintext password against the stored hash.

    Called during login: if this returns True, `create_access_token` is used
    to issue the user a JWT.
    """
    return pwd_context.verify(plain_password, hashed_password)
