const mockListen = jest.fn();
const mockCreate = jest.fn(async () => ({ listen: mockListen }));

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: mockCreate,
  },
}));

describe('bootstrap', () => {
  beforeEach(() => {
    mockListen.mockClear();
    mockCreate.mockClear();
    process.env.PORT = '4567';
    jest.resetModules();
  });

  it('starts the application on configured port', async () => {
    require('./main');
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockCreate).toHaveBeenCalled();
    expect(mockListen).toHaveBeenCalledWith('4567');
  });
});
