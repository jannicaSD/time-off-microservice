const mockListen = jest.fn();
const mockUseGlobalPipes = jest.fn();
const mockCreate = jest.fn(async () => ({ listen: mockListen, useGlobalPipes: mockUseGlobalPipes }));
const mockCreateDocument = jest.fn(() => ({}));
const mockSetup = jest.fn();

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: mockCreate,
  },
}));

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle() {
      return this;
    },
    setDescription() {
      return this;
    },
    setVersion() {
      return this;
    },
    build() {
      return {};
    },
  })),
  SwaggerModule: {
    createDocument: mockCreateDocument,
    setup: mockSetup,
  },
}));

describe('bootstrap', () => {
  beforeEach(() => {
    mockListen.mockClear();
    mockUseGlobalPipes.mockClear();
    mockCreateDocument.mockClear();
    mockSetup.mockClear();
    mockCreate.mockClear();
    process.env.PORT = '4567';
    jest.resetModules();
  });

  it('starts the application on configured port', async () => {
    require('./main');
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockCreate).toHaveBeenCalled();
    expect(mockUseGlobalPipes).toHaveBeenCalled();
    expect(mockCreateDocument).toHaveBeenCalled();
    expect(mockSetup).toHaveBeenCalledWith('api/docs', expect.anything(), expect.anything());
    expect(mockListen).toHaveBeenCalledWith(4567);
  });
});
