import fetchMock from 'jest-fetch-mock';
import { get, has, digest, getAll } from './index.edge';

const baseUrl = 'https://edge-config.vercel.com/ecfg-1';

describe('default Edge Config', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  describe('test conditions', () => {
    it('should have an env var called EDGE_CONFIG', () => {
      expect(process.env.EDGE_CONFIG).toEqual(
        'https://edge-config.vercel.com/ecfg-1?token=token-1',
      );
    });
  });

  it('should fetch an item from the Edge Config specified by process.env.EDGE_CONFIG', async () => {
    fetchMock.mockResponse(JSON.stringify('bar'));

    await expect(get('foo')).resolves.toEqual('bar');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/item/foo?version=1`, {
      headers: { Authorization: 'Bearer token-1' },
    });
  });

  describe('get(key)', () => {
    describe('when item exists', () => {
      it('should return the value', async () => {
        fetchMock.mockResponse(JSON.stringify('bar'));

        await expect(get('foo')).resolves.toEqual('bar');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/item/foo?version=1`,
          { headers: { Authorization: 'Bearer token-1' } },
        );
      });
    });

    describe('when the item does not exist', () => {
      it('should return undefined', async () => {
        fetchMock.mockResponse(
          JSON.stringify({
            error: {
              code: 'edge_config_item_not_found',
              message: 'Could not find the edge config item: foo',
            },
          }),
          {
            status: 404,
            headers: {
              'content-type': 'application/json',
              'x-edge-config-digest': 'fake',
            },
          },
        );

        await expect(get('foo')).resolves.toEqual(undefined);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/item/foo?version=1`,
          { headers: { Authorization: 'Bearer token-1' } },
        );
      });
    });

    describe('when the edge config does not exist', () => {
      it('should return undefined', async () => {
        fetchMock.mockResponse(
          JSON.stringify({
            error: {
              code: 'edge_config_not_found',
              message: 'Could not find the edge config: ecfg-1',
            },
          }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        );

        await expect(get('foo')).rejects.toThrow(
          '@vercel/edge-config: Edge Config not found',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/item/foo?version=1`,
          {
            headers: { Authorization: 'Bearer token-1' },
          },
        );
      });
    });

    describe('when the network fails', () => {
      it('should throw a Network error', async () => {
        fetchMock.mockReject();

        await expect(get('foo')).rejects.toThrow(
          '@vercel/edge-config: Network error',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/item/foo?version=1`,
          {
            headers: { Authorization: 'Bearer token-1' },
          },
        );
      });
    });

    describe('when an unexpected status code is returned', () => {
      it('should throw a Unexpected error on 500', async () => {
        fetchMock.mockResponse('', { status: 500 });

        await expect(get('foo')).rejects.toThrow(
          '@vercel/edge-config: Unexpected error',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/item/foo?version=1`,
          {
            headers: { Authorization: 'Bearer token-1' },
          },
        );
      });
    });
  });

  describe('getAll(keys)', () => {
    describe('when called without keys', () => {
      it('should return all items', async () => {
        fetchMock.mockResponse(JSON.stringify({ foo: 'foo1' }));

        await expect(getAll()).resolves.toEqual({ foo: 'foo1' });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/items?version=1`, {
          headers: { Authorization: 'Bearer token-1' },
        });
      });
    });

    describe('when called with keys', () => {
      it('should return the selected items', async () => {
        fetchMock.mockResponse(JSON.stringify({ foo: 'foo1', bar: 'bar1' }));

        await expect(getAll(['foo', 'bar'])).resolves.toEqual({
          foo: 'foo1',
          bar: 'bar1',
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/items?version=1&key=foo&key=bar`,
          { headers: { Authorization: 'Bearer token-1' } },
        );
      });
    });

    describe('when the edge config does not exist', () => {
      it('should throw', async () => {
        fetchMock.mockResponse(
          JSON.stringify({
            error: {
              code: 'edge_config_not_found',
              message: 'Could not find the edge config: ecfg-1',
            },
          }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        );

        await expect(getAll(['foo', 'bar'])).rejects.toThrow(
          '@vercel/edge-config: Edge Config not found',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/items?version=1&key=foo&key=bar`,
          { headers: { Authorization: 'Bearer token-1' } },
        );
      });
    });

    describe('when the network fails', () => {
      it('should throw a Network error', async () => {
        fetchMock.mockReject();

        await expect(getAll()).rejects.toThrow(
          '@vercel/edge-config: Network error',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/items?version=1`, {
          headers: { Authorization: 'Bearer token-1' },
        });
      });
    });

    describe('when an unexpected status code is returned', () => {
      it('should throw a Unexpected error on 500', async () => {
        fetchMock.mockResponse('', { status: 500 });

        await expect(getAll()).rejects.toThrow(
          '@vercel/edge-config: Unexpected error',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/items?version=1`, {
          headers: { Authorization: 'Bearer token-1' },
        });
      });
    });
  });

  describe('has(key)', () => {
    describe('when item exists', () => {
      it('should return true', async () => {
        fetchMock.mockResponse('');

        await expect(has('foo')).resolves.toEqual(true);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/item/foo?version=1`,
          {
            method: 'HEAD',
            headers: { Authorization: 'Bearer token-1' },
          },
        );
      });
    });

    describe('when the item does not exist', () => {
      it('should return false', async () => {
        fetchMock.mockResponse(
          JSON.stringify({
            error: {
              code: 'edge_config_item_not_found',
              message: 'Could not find the edge config item: foo',
            },
          }),
          {
            status: 404,
            headers: {
              'content-type': 'application/json',
              'x-edge-config-digest': 'fake',
            },
          },
        );

        await expect(has('foo')).resolves.toEqual(false);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/item/foo?version=1`,
          {
            method: 'HEAD',
            headers: { Authorization: 'Bearer token-1' },
          },
        );
      });
    });

    describe('when the edge config does not exist', () => {
      it('should return false', async () => {
        fetchMock.mockResponse(
          JSON.stringify({
            error: {
              code: 'edge_config_not_found',
              message: 'Could not find the edge config: ecfg-1',
            },
          }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        );

        await expect(has('foo')).rejects.toThrow(
          '@vercel/edge-config: Edge Config not found',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
          `${baseUrl}/item/foo?version=1`,
          {
            method: 'HEAD',
            headers: { Authorization: 'Bearer token-1' },
          },
        );
      });
    });
  });

  describe('/', () => {
    describe('when the request succeeds', () => {
      it('should return the digest', async () => {
        fetchMock.mockResponse(JSON.stringify('awe1'));

        await expect(digest()).resolves.toEqual('awe1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/digest?version=1`, {
          headers: { Authorization: 'Bearer token-1' },
        });
      });
    });

    describe('when the server returns an unexpected status code', () => {
      it('should throw an Unexpected error on 500', async () => {
        fetchMock.mockResponse('', { status: 500 });

        await expect(digest()).rejects.toThrow(
          '@vercel/edge-config: Unexpected error',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/digest?version=1`, {
          headers: { Authorization: 'Bearer token-1' },
        });
      });

      it('should throw an Unexpected error on 404', async () => {
        fetchMock.mockResponse('', { status: 404 });

        await expect(digest()).rejects.toThrow(
          '@vercel/edge-config: Unexpected error',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/digest?version=1`, {
          headers: { Authorization: 'Bearer token-1' },
        });
      });
    });

    describe('when the network fails', () => {
      it('should throw a Network error', async () => {
        fetchMock.mockReject();

        await expect(digest()).rejects.toThrow(
          '@vercel/edge-config: Network error',
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(`${baseUrl}/digest?version=1`, {
          headers: { Authorization: 'Bearer token-1' },
        });
      });
    });
  });
});
