import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminRepository } from './admin.repository.js';
import { AdminService } from './admin.service.js';

function serviceWith(stubs: {
  findById?: unknown;
  wallet?: { isActive: boolean; accountNumber: string } | null;
}) {
  const admin = {
    findWalletByUserId: vi.fn().mockResolvedValue(stubs.wallet ?? null),
    setWalletActive: vi
      .fn()
      .mockImplementation(async (userId: string, isActive: boolean) => ({
        userId,
        accountNumber: '1234567895',
        isActive,
      })),
  } as unknown as AdminRepository;
  const users = {
    findById: vi.fn().mockResolvedValue(stubs.findById ?? null),
  } as never;
  return { service: new AdminService(admin, users), admin };
}

describe('AdminService', () => {
  it('rejects malformed account numbers before touching the database', async () => {
    const adminRepo = { resolveFullByAccountNumber: vi.fn() } as unknown as AdminRepository;
    const service = new AdminService(adminRepo, {} as never);
    await expect(service.resolveAccount('123')).rejects.toBeInstanceOf(BadRequestException);
    expect(adminRepo.resolveFullByAccountNumber).not.toHaveBeenCalled();
  });

  it('refuses to freeze an already-frozen wallet without writing audit', async () => {
    const { service, admin } = serviceWith({
      findById: { id: 'u1', isDeleted: false },
      wallet: { isActive: false, accountNumber: '1234567895' },
    });
    await expect(
      service.freezeWallet('u1', 'admin1', { action: 'FREEZE', reason: 'fraud suspected here' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(admin.setWalletActive).not.toHaveBeenCalled();
  });

  it('freezes an active wallet and returns the updated view', async () => {
    const { service, admin } = serviceWith({
      findById: { id: 'u1', isDeleted: false },
      wallet: { isActive: true, accountNumber: '1234567895' },
    });
    const result = await service.freezeWallet('u1', 'admin1', {
      action: 'FREEZE',
      reason: 'fraud suspected here',
    });
    expect(result).toMatchObject({ userId: 'u1', isActive: false, action: 'FREEZE' });
    expect(admin.setWalletActive).toHaveBeenCalledWith(
      'u1',
      false,
      'admin1',
      'WALLET_FREEZE',
      'fraud suspected here',
    );
  });
});
