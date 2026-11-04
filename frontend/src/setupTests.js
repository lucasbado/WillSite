import { webcrypto } from 'crypto';

Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
