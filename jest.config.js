module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['./test/'],
  collectCoverageFrom: [
    'src/*.{js,ts}'
  ]
};
