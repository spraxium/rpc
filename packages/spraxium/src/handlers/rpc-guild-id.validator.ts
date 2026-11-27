import { Code, ConnectError } from '@connectrpc/connect';

export class RpcGuildIdValidator {
  static read(input: unknown): string {
    const guildId = input && typeof input === 'object' && 'guildId' in input ? input.guildId : undefined;
    if (
      typeof guildId !== 'string' ||
      !/^[1-9][0-9]{0,19}$/.test(guildId) ||
      BigInt(guildId) > 0xffffffffffffffffn
    ) {
      throw new ConnectError('A valid guildId string is required.', Code.InvalidArgument);
    }

    return guildId;
  }
}
