import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Person } from '../entities/person.entity';
import { PersonContact } from '../entities/person-contact.entity';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

@Injectable()
export class PersonsService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(PersonContact)
    private readonly personContactRepository: Repository<PersonContact>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPersonDto: CreatePersonDto): Promise<Person> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create person
      const person = this.personRepository.create({
        full_name: createPersonDto.full_name,
        email: createPersonDto.email,
        phone: createPersonDto.phone,
        birth_date: createPersonDto.birth_date,
        gender: createPersonDto.gender,
        is_member: createPersonDto.is_member
      });
      await queryRunner.manager.save(person);

      // Create contacts if provided
      if (createPersonDto.contacts) {
        const contacts = createPersonDto.contacts.map(contactDto => 
          this.personContactRepository.create({
            person: person,
            type: contactDto.type,
            value: contactDto.value,
            is_primary: contactDto.is_primary
          })
        );
        await queryRunner.manager.save(contacts);
      }

      await queryRunner.commitTransaction();

      return await this.findOne(person.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<Person[]> {
    return await this.personRepository.find({
      relations: ['contacts']
    });
  }

  async findOne(id: string): Promise<Person> {
    const person = await this.personRepository.findOne({
      where: { id },
      relations: ['contacts']
    });

    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    return person;
  }

  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<Person> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const person = await this.findOne(id);

      // Update basic person info
      if (updatePersonDto.full_name) person.full_name = updatePersonDto.full_name;
      if (updatePersonDto.email !== undefined) person.email = updatePersonDto.email;
      if (updatePersonDto.phone !== undefined) person.phone = updatePersonDto.phone;
      if (updatePersonDto.birth_date !== undefined) person.birth_date = updatePersonDto.birth_date;
      if (updatePersonDto.gender !== undefined) person.gender = updatePersonDto.gender;
      if (updatePersonDto.is_member !== undefined) person.is_member = updatePersonDto.is_member;

      await queryRunner.manager.save(person);

      // Update contacts if provided
      if (updatePersonDto.contacts) {
        // Delete existing contacts
        await queryRunner.manager.delete(PersonContact, { person: { id } });

        // Create new contacts
        const contacts = updatePersonDto.contacts.map(contactDto =>
          this.personContactRepository.create({
            person: person,
            type: contactDto.type,
            value: contactDto.value,
            is_primary: contactDto.is_primary
          })
        );
        await queryRunner.manager.save(contacts);
      }

      await queryRunner.commitTransaction();

      return await this.findOne(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<void> {
    const person = await this.findOne(id);

    // Delete all contacts first
    await this.personContactRepository.delete({ person: { id } });

    // Then delete the person
    await this.personRepository.remove(person);
  }
}