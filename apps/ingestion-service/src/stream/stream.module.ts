import { Module, Global } from '@nestjs/common';
import { StreamGateway } from './stream.gateway';

@Global()
@Module({
  providers: [StreamGateway],
  exports: [StreamGateway],
})
export class StreamModule {}