/** Reloj e identificador, inyectables para tests deterministas (PLAN §2). */
export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  newId(): string;
}
