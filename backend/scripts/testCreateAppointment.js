(async () => {
  const base = 'http://localhost:4000';
  try {
    // Login
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dentalcare.com', password: '123456' })
    });
    const login = await loginRes.json();
    if (!login.token) {
      console.error('Login failed:', login);
      process.exit(1);
    }
    console.log('Login OK. Token acquired.');
    const token = login.token;

    // Get patients
    const patientsRes = await fetch(base + '/api/patients', { headers: { Authorization: 'Bearer ' + token } });
    const patients = await patientsRes.json();
    console.log('Patients:', patients && patients.patients ? patients.patients.length : patients);

    // Get users
    const usersRes = await fetch(base + '/api/users', { headers: { Authorization: 'Bearer ' + token } });
    const users = await usersRes.json();
    console.log('Users:', users && users.users ? users.users.length : users);

    if (!patients.patients || patients.patients.length === 0) {
      console.error('No patients found. Cannot create appointment.');
      process.exit(1);
    }

    const patientId = patients.patients[0].id;
    // find a doctor, fallback to first user
    let doctor = users.users.find(u => String(u.role).toLowerCase() === 'doctor');
    if (!doctor) doctor = users.users[0];
    const doctorId = doctor.id;

    // schedule for tomorrow at 09:00
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9,0,0,0);

    const apptRes = await fetch(base + '/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ patientId, doctorId, procedure: 'Checkup', scheduledAt: d.toISOString(), duration: 60 })
    });
    const appt = await apptRes.json();
    console.log('Create appointment response status:', apptRes.status);
    console.log('Response body:', appt);

    // Fetch appointments list
    const listRes = await fetch(base + '/api/appointments', { headers: { Authorization: 'Bearer ' + token } });
    const list = await listRes.json();
    console.log('Total appointments now:', list.appointments ? list.appointments.length : list);

  } catch (e) {
    console.error('Error during test:', e);
    process.exit(1);
  }
})();