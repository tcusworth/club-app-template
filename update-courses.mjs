import { db } from './server/db.ts';
import { courses } from './drizzle/schema.ts';

async function updateCoursesStatus() {
  try {
    const result = await db.db
      .update(courses)
      .set({ status: 'coming_soon' })
      .execute();
    
    console.log('✓ Updated courses to coming_soon status');
    
    const allCourses = await db.db.select().from(courses).execute();
    console.log(`Total courses: ${allCourses.length}`);
    allCourses.forEach(c => {
      console.log(`  - ${c.title}: ${c.status}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

updateCoursesStatus();
