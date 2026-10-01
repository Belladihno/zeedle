import { BeforeInsert, PrimaryColumn } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

/** UUIDv7 primary key, assigned in-app so the id exists before insert. */
export abstract class BaseEntity {
  @PrimaryColumn('uuid')
  id: string;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
