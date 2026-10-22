export type Task = { id: number; title: string; due: string | null; done: boolean };

export class Store {
  private tasks: Task[] = [];
  private nextId = 1;

  add(title: string, due: string | null): Task {
    const task: Task = { id: this.nextId++, title, due, done: false };
    this.tasks.push(task);
    return task;
  }

  all(): Task[] {
    return [...this.tasks];
  }
}
