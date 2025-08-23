import { SetMetadata } from '@nestjs/common';

export const APPLICATION_ID_KEY = 'applicationId';
export const ApplicationAuth = (applicationId: string) => SetMetadata(APPLICATION_ID_KEY, applicationId);