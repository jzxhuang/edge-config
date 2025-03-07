// This file is meant to ensure the common logic works in both enviornments.
//
// It runs tests in both envs:
// - @edge-runtime/jest-environment
// - node
// and tests both entry points
// - index.node
// - index.edge
import fetchMock from 'jest-fetch-mock';
import * as node from './index.node';
import * as edge from './index.edge';
import type { EdgeConfigClient } from './types';

describe('package exports', () => {
  it('should have the same exports in both runtimes', () => {
    expect(Object.keys(node)).toEqual(Object.keys(edge));
  });
});

describe('test conditions', () => {
  it('should have an env var called EDGE_CONFIG', () => {
    expect(process.env.EDGE_CONFIG).toEqual(
      'https://edge-config.vercel.com/ecfg-1?token=token-1',
    );
  });
});

// test both package.json exports (for node & edge) separately
describe.each([
  ['node', node],
  ['edge', edge],
])('%s', (packageName, pkg) => {
  describe('parseConnectionString', () => {
    it('should return null when an invalid Connection String is given', () => {
      expect(pkg.parseConnectionString('foo')).toBeNull();
    });

    it('should return null when the given Connection String has no token', () => {
      expect(
        pkg.parseConnectionString(
          'https://edge-config.vercel.com/ecfg_cljia81u2q1gappdgptj881dwwtc',
        ),
      ).toBeNull();
    });

    it('should return the id and token when a valid Connection String is given', () => {
      expect(
        pkg.parseConnectionString(
          'https://edge-config.vercel.com/ecfg_cljia81u2q1gappdgptj881dwwtc?token=00000000-0000-0000-0000-000000000000',
        ),
      ).toEqual({
        id: 'ecfg_cljia81u2q1gappdgptj881dwwtc',
        token: '00000000-0000-0000-0000-000000000000',
      });
    });
  });

  describe('when running without lambda layer or via edge function', () => {
    const modifiedConnectionString =
      'https://edge-config.vercel.com/ecfg-2?token=token-2';
    const modifiedBaseUrl = 'https://edge-config.vercel.com/ecfg-2';
    let edgeConfig: EdgeConfigClient;

    beforeEach(() => {
      fetchMock.resetMocks();

      edgeConfig = pkg.createClient(modifiedConnectionString);
    });

    it('should be a function', () => {
      expect(typeof pkg.createClient).toBe('function');
    });

    describe('when called without a baseUrl', () => {
      it('should throw', () => {
        expect(() => pkg.createClient(undefined)).toThrow(
          '@vercel/edge-config: No connection string provided',
        );
      });
    });

    describe('get', () => {
      describe('when item exists', () => {
        it('should fetch using information from the passed token', async () => {
          fetchMock.mockResponse(JSON.stringify('bar'));

          await expect(edgeConfig.get('foo')).resolves.toEqual('bar');

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock).toHaveBeenCalledWith(
            `${modifiedBaseUrl}/item/foo?version=1`,
            { headers: { Authorization: 'Bearer token-2' } },
          );
        });
      });
    });

    describe('has(key)', () => {
      describe('when item exists', () => {
        it('should return true', async () => {
          fetchMock.mockResponse('');

          await expect(edgeConfig.has('foo')).resolves.toEqual(true);

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock).toHaveBeenCalledWith(
            `${modifiedBaseUrl}/item/foo?version=1`,
            {
              method: 'HEAD',
              headers: { Authorization: 'Bearer token-2' },
            },
          );
        });
      });
    });

    describe('digest()', () => {
      describe('when the request succeeds', () => {
        it('should return the digest', async () => {
          fetchMock.mockResponse(JSON.stringify('awe1'));

          await expect(edgeConfig.digest()).resolves.toEqual('awe1');

          expect(fetchMock).toHaveBeenCalledTimes(1);
          expect(fetchMock).toHaveBeenCalledWith(
            `${modifiedBaseUrl}/digest?version=1`,
            { headers: { Authorization: 'Bearer token-2' } },
          );
        });
      });
    });
  });
});
