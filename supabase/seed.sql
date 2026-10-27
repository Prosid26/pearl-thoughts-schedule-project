-- ========================================================================
-- PEARL THOUGHTS SCHEDULE PROJECT - DEMO SEED DATA
-- Default password for all demo accounts: Password123!
-- ========================================================================

-- Clear existing data if re-seeding
TRUNCATE TABLE appointments, availability, doctors, patients, users RESTART IDENTITY CASCADE;

-- Insert Users
INSERT INTO users (full_name, email, phone, password_hash, role, created_at) VALUES
-- Patients (user_id 1, 2)
('John Doe', 'patient@demo.com', '+1 (555) 234-5678', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'patient', NOW()),
('Jane Smith', 'jane@demo.com', '+1 (555) 876-5432', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'patient', NOW()),

-- Doctors (user_id 3, 4, 5, 6, 7)
('Dr. Sarah Jenkins', 'doctor.sarah@demo.com', '+1 (555) 901-2345', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Marcus Vance', 'doctor.marcus@demo.com', '+1 (555) 345-6789', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Elena Rostova', 'doctor.elena@demo.com', '+1 (555) 456-7890', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. David Chen', 'doctor.david@demo.com', '+1 (555) 567-8901', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Priya Sharma', 'doctor.priya@demo.com', '+1 (555) 678-9012', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW());

-- Insert Patients (patient_id 1, 2)
INSERT INTO patients (user_id, date_of_birth, gender, address, created_at) VALUES
(1, '1992-05-14', 'Male', '742 Evergreen Terrace, Springfield, IL', NOW()),
(2, '1996-11-22', 'Female', '128 Beacon St, Boston, MA', NOW());

-- Insert Doctors (doctor_id 1 to 5)
INSERT INTO doctors (user_id, specialization, qualification, experience_years, consultation_fee, bio, avatar_url, clinic_address, created_at) VALUES
(
    3, 
    'Cardiology', 
    'MBBS, MD, FACC (Harvard Medical School)', 
    15, 
    120.00, 
    'Dr. Sarah Jenkins is an internationally recognized consultant cardiologist specializing in preventive cardiology, echocardiography, hypertension, and heart rhythm management. She has authored over 25 peer-reviewed publications.',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    'Pearl Thought Heart Institute, Suite 402, Boston, MA',
    NOW()
),
(
    4, 
    'Dermatology', 
    'MD Dermatology (Johns Hopkins University)', 
    11, 
    95.00, 
    'Dr. Marcus Vance provides comprehensive clinical and cosmetic dermatologic care. Specializing in eczema, psoriasis, acne management, and laser therapies with an emphasis on evidence-based skin health.',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    'Aesthetic & Clinical Derma Center, 5th Floor, New York, NY',
    NOW()
),
(
    5, 
    'Neurology', 
    'MD, PhD Neurology (Stanford University)', 
    18, 
    160.00, 
    'Dr. Elena Rostova is a board-certified neurologist focusing on complex migraine syndromes, neuro-degenerative diseases, and sleep disorders. She brings 18 years of clinical leadership.',
    'https://images.unsplash.com/photo-1594824813593-7859c7717462?auto=format&fit=crop&q=80&w=300',
    'Stanford Neurocare Pavilion, Suite 12B, Palo Alto, CA',
    NOW()
),
(
    6, 
    'Pediatrics', 
    'MD, FAAP Pediatrics (Columbia University)', 
    12, 
    85.00, 
    'Dr. David Chen is beloved for his gentle, attentive care with newborns, children, and adolescents. Specializing in childhood immunization, developmental milestones, and pediatric asthma.',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300',
    'Columbia Children Wellness Clinic, Chicago, IL',
    NOW()
),
(
    7, 
    'Orthopedics', 
    'MBBS, MS Ortho, MCh (AIIMS & Oxford Fellowship)', 
    14, 
    140.00, 
    'Dr. Priya Sharma specializes in joint preservation, arthroscopic knee and shoulder reconstruction, and sports medicine rehabilitation for athletes and active adults.',
    'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=300',
    'Metropolitan Bone & Joint Center, Seattle, WA',
    NOW()
);

-- Insert Availability Slots (Tomorrow onwards)
-- Dr. Sarah Jenkins (doctor_id 1)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(1, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '09:30:00', 30, true),
(1, CURRENT_DATE + INTERVAL '1 day', '09:30:00', '10:00:00', 30, true),
(1, CURRENT_DATE + INTERVAL '1 day', '10:00:00', '10:30:00', 30, false), -- booked
(1, CURRENT_DATE + INTERVAL '1 day', '11:00:00', '11:30:00', 30, true),
(1, CURRENT_DATE + INTERVAL '1 day', '14:00:00', '14:30:00', 30, true),
(1, CURRENT_DATE + INTERVAL '1 day', '15:00:00', '15:30:00', 30, true),
(1, CURRENT_DATE + INTERVAL '2 day', '09:00:00', '09:30:00', 30, true),
(1, CURRENT_DATE + INTERVAL '2 day', '10:00:00', '10:30:00', 30, true),
(1, CURRENT_DATE + INTERVAL '3 day', '14:00:00', '14:30:00', 30, true);

-- Dr. Marcus Vance (doctor_id 2)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(2, CURRENT_DATE + INTERVAL '1 day', '10:00:00', '10:30:00', 30, true),
(2, CURRENT_DATE + INTERVAL '1 day', '10:30:00', '11:00:00', 30, true),
(2, CURRENT_DATE + INTERVAL '1 day', '11:30:00', '12:00:00', 30, true),
(2, CURRENT_DATE + INTERVAL '2 day', '13:00:00', '13:30:00', 30, true),
(2, CURRENT_DATE + INTERVAL '2 day', '14:00:00', '14:30:00', 30, true);

-- Dr. Elena Rostova (doctor_id 3)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(3, CURRENT_DATE + INTERVAL '1 day', '11:00:00', '11:30:00', 30, true),
(3, CURRENT_DATE + INTERVAL '1 day', '14:30:00', '15:00:00', 30, true),
(3, CURRENT_DATE + INTERVAL '2 day', '15:00:00', '15:30:00', 30, true);

-- Dr. David Chen (doctor_id 4)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(4, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '09:30:00', 30, true),
(4, CURRENT_DATE + INTERVAL '1 day', '10:00:00', '10:30:00', 30, true),
(4, CURRENT_DATE + INTERVAL '2 day', '11:00:00', '11:30:00', 30, true);

-- Dr. Priya Sharma (doctor_id 5)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(5, CURRENT_DATE + INTERVAL '1 day', '13:30:00', '14:00:00', 30, true),
(5, CURRENT_DATE + INTERVAL '2 day', '14:30:00', '15:00:00', 30, true),
(5, CURRENT_DATE + INTERVAL '3 day', '10:00:00', '10:30:00', 30, true);

-- Insert Sample Existing Appointment
-- John Doe (patient_id 1) booked slot 3 with Dr. Sarah Jenkins (doctor_id 1)
INSERT INTO appointments (patient_id, doctor_id, availability_id, appointment_date, status, reason, created_at) VALUES
(1, 1, 3, (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00')::TIMESTAMP WITH TIME ZONE, 'confirmed', 'Annual routine cardiac checkup and blood pressure review.', NOW());
