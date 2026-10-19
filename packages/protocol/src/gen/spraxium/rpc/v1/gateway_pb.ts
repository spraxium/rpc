import type { Message } from '@bufbuild/protobuf';
import type { GenFile, GenMessage, GenService } from '@bufbuild/protobuf/codegenv2';
import { fileDesc, messageDesc, serviceDesc } from '@bufbuild/protobuf/codegenv2';
export const file_spraxium_rpc_v1_gateway: GenFile = fileDesc(
  'Ch1zcHJheGl1bS9ycGMvdjEvZ2F0ZXdheS5wcm90bxIPc3ByYXhpdW0ucnBjLnYxIjUKDUludm9rZVJlcXVlc3QSDgoGbWV0aG9kGAEgASgJEhQKDHBheWxvYWRfanNvbhgCIAEoDCImCg5JbnZva2VSZXNwb25zZRIUCgxwYXlsb2FkX2pzb24YASABKAwyVwoKUnBjR2F0ZXdheRJJCgZJbnZva2USHi5zcHJheGl1bS5ycGMudjEuSW52b2tlUmVxdWVzdBofLnNwcmF4aXVtLnJwYy52MS5JbnZva2VSZXNwb25zZUIWChJpby5zcHJheGl1bS5ycGMudjFQAWIGcHJvdG8z',
);
export type InvokeRequest = Message<'spraxium.rpc.v1.InvokeRequest'> & {
  method: string;
  payloadJson: Uint8Array;
};
export const InvokeRequestSchema: GenMessage<InvokeRequest> = messageDesc(file_spraxium_rpc_v1_gateway, 0);
export type InvokeResponse = Message<'spraxium.rpc.v1.InvokeResponse'> & {
  payloadJson: Uint8Array;
};
export const InvokeResponseSchema: GenMessage<InvokeResponse> = messageDesc(file_spraxium_rpc_v1_gateway, 1);
export const RpcGateway: GenService<{
  invoke: {
    methodKind: 'unary';
    input: typeof InvokeRequestSchema;
    output: typeof InvokeResponseSchema;
  };
}> = serviceDesc(file_spraxium_rpc_v1_gateway, 0);
