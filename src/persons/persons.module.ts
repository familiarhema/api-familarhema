import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonsService } from './persons.service';
import { PersonsController } from './persons.controller';
import { Person } from '../entities/person.entity';
import { PersonContact } from '../entities/person-contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Person, PersonContact])],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService],
})
export class PersonsModule {}