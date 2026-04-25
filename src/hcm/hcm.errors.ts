export class HcmUnavailableError extends Error {
  constructor(message = 'Unable to validate HCM balance') {
    super(message);
    this.name = 'HcmUnavailableError';
  }
}
