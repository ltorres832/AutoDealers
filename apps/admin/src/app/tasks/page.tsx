'use client';

import TasksList from '@/components/TasksList';

export default function TasksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tareas y Actividades</h1>
      <TasksList />
    </div>
  );
}
