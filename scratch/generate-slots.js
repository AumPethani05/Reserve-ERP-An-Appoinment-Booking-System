
import mysql from 'mysql2/promise';

async function generateSlots() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not found');
    process.exit(1);
  }
  
  const pool = mysql.createPool(url);

  try {
    console.log('Generating slots for all providers...');
    
    const [providers] = await pool.query('SELECT id FROM providers WHERE is_onboarded = true');
    
    console.log(`Found ${providers.length} onboarded providers.`);
    
    const today = new Date();
    const daysToGenerate = 30;
    
    for (const provider of providers) {
      const providerId = provider.id;
      
      const [resources] = await pool.query(
        'SELECT id FROM resources WHERE provider_id = ? AND is_active = true',
        [providerId]
      );
      const [schedules] = await pool.query(
        'SELECT * FROM schedules WHERE provider_id = ? AND is_active = true',
        [providerId]
      );
      
      if (resources.length === 0 || schedules.length === 0) {
        console.log(`Provider ${providerId} has no resources or schedules. Skipping.`);
        continue;
      }
      
      const scheduleMap = {};
      for (const sc of schedules) {
        scheduleMap[sc.day_of_week] = sc;
      }
      
      let insertedCount = 0;
      for (const resource of resources) {
        const dates = [];
        const startTimes = [];
        const endTimes = [];
        
        for (let d = 0; d < daysToGenerate; d++) {
          const dt = new Date(today);
          dt.setDate(today.getDate() + d);
          const dateStr = dt.toISOString().split('T')[0];
          const dow = dt.getDay();
          const sched = scheduleMap[dow];
          
          if (!sched) continue;
          
          const [sh, sm] = sched.start_time.split(':').map(Number);
          const [eh, em] = sched.end_time.split(':').map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          const dur = Number(sched.slot_duration) || 60;
          
          for (let t = startMin; t + dur <= endMin; t += dur) {
            const s = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
            const e = `${String(Math.floor((t + dur) / 60)).padStart(2, '0')}:${String((t + dur) % 60).padStart(2, '0')}`;
            dates.push(dateStr);
            startTimes.push(s);
            endTimes.push(e);
          }
        }
        
        if (dates.length > 0) {
          const placeholders = dates.map(() => '(?, ?, ?, ?, "available", ?)').join(', ');
          const flatValues = [];
          for (let i = 0; i < dates.length; i++) {
            flatValues.push(providerId, dates[i], startTimes[i], endTimes[i], resource.id);
          }
          
          await pool.query(
            `INSERT IGNORE INTO slots (provider_id, date, start_time, end_time, status, resource_id) VALUES ${placeholders}`,
            flatValues
          );
          insertedCount += dates.length;
        }
      }
      console.log(`Generated ${insertedCount} slots for provider ${providerId}.`);
    }
    
    console.log('Finished generating slots.');
    process.exit(0);
  } catch (err) {
    console.error('Error generating slots:', err);
    process.exit(1);
  }
}

generateSlots();
