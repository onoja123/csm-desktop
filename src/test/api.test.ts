import { invoke } from '@tauri-apps/api/core';
import { api, ApiError, ConnectionError } from '@/lib/api';

const mocked = vi.mocked(invoke);

describe('api client', () => {
  beforeEach(() => mocked.mockReset());

  it('parses JSON bodies and passes method, path and body through', async () => {
    mocked.mockResolvedValueOnce({ status: 200, body: '{"accounts":2}' });

    const res = await api.status();

    expect(res).toEqual({ accounts: 2 });

    expect(mocked).toHaveBeenCalledWith('csm_request', {
      method: 'GET',
      path: '/v1/status',
      body: null,
    });
  });

  it('serialises request bodies', async () => {
    mocked.mockResolvedValueOnce({ status: 200, body: '{"ok":true}' });
    await api.setPriority('work', 2);

    expect(mocked).toHaveBeenCalledWith('csm_request', {
      method: 'POST',
      path: '/v1/accounts/work/priority',
      body: '{"position":2}',
    });
  });

  it('turns service errors into ApiError with the message', async () => {
    mocked.mockResolvedValueOnce({
      status: 409,
      body: '{"error":"work is disabled; enable it first"}',
    });

    await expect(api.switchAccount('work')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'work is disabled; enable it first',
    });
  });

  it('keeps a non-JSON error body as the message', async () => {
    mocked.mockResolvedValueOnce({ status: 500, body: 'boom' });
    await expect(api.accounts()).rejects.toBeInstanceOf(ApiError);
  });

  it('wraps transport failures as ConnectionError', async () => {
    mocked.mockRejectedValueOnce('cannot reach the csm service');
    await expect(api.runs()).rejects.toBeInstanceOf(ConnectionError);
  });

  it('builds query strings for MCP project lookups', async () => {
    mocked.mockResolvedValueOnce({ status: 200, body: '[]' });
    await api.mcp('/tmp/a b');

    expect(mocked).toHaveBeenCalledWith(
      'csm_request',
      expect.objectContaining({ path: '/v1/mcp?project_dir=%2Ftmp%2Fa+b' }),
    );
  });
});
