import { contextOptions } from './const';

it('should be equal to debug', () => {
  expect(contextOptions.log?.level).toEqual('debug');
});
