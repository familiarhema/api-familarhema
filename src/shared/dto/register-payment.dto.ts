import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterPaymentDto {
  @ApiProperty({
    description: 'The payment date',
    type: 'string',
    format: 'date',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  payment_date?: Date;
}