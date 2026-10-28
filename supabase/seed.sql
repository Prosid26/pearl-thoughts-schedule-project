-- ========================================================================
-- PEARL THOUGHTS SCHEDULE PROJECT - DEMO SEED DATA (INDIAN HEALTHCARE DATA)
-- Default password for all demo accounts: Password123!
-- ========================================================================

-- Clear existing data if re-seeding
TRUNCATE TABLE appointments, availability, doctors, patients, users RESTART IDENTITY CASCADE;

-- Insert Users (user_id 1 to 10)
INSERT INTO users (full_name, email, phone, password_hash, role, created_at) VALUES
-- Patients (user_id 1, 2)
('Aarav Sharma', 'patient@demo.com', '+91 98200 11223', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'patient', NOW()),
('Priya Verma', 'jane@demo.com', '+91 98200 44556', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'patient', NOW()),

-- Doctors (user_id 3 to 10)
('Dr. Ananya Sharma', 'doctor.ananya@demo.com', '+91 98201 23456', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Priya Nair', 'doctor.priya@demo.com', '+91 98202 34567', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Rohan Iyer', 'doctor.rohan@demo.com', '+91 98203 45678', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Sneha Kulkarni', 'doctor.sneha@demo.com', '+91 98204 56789', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Rahul Mehta', 'doctor.rahul@demo.com', '+91 98205 67890', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Arjun Deshmukh', 'doctor.arjun@demo.com', '+91 98206 78901', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Aditi Patel', 'doctor.aditi@demo.com', '+91 98207 89012', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW()),
('Dr. Karan Shah', 'doctor.karan@demo.com', '+91 98208 90123', '$2b$10$Y4V1ca7OIGdoLWYIoPIZz.Y.m0bwBRavjVOoiwJsefMqf6cFimVly', 'doctor', NOW());

-- Insert Patients (patient_id 1, 2)
INSERT INTO patients (user_id, date_of_birth, gender, address, created_at) VALUES
(1, '1992-05-14', 'Male', '204 Silver Arch, Lokhandwala Complex, Andheri West, Mumbai', NOW()),
(2, '1996-11-22', 'Female', '501 Sea View Apartments, Hill Road, Bandra West, Mumbai', NOW());

-- Insert Doctors (doctor_id 1 to 8)
INSERT INTO doctors (user_id, specialization, qualification, experience_years, consultation_fee, bio, avatar_url, clinic_address, created_at) VALUES
(
    3, 
    'Cardiology', 
    'MBBS, MD (Medicine), DM (Cardiology - AIIMS New Delhi)', 
    14, 
    1000.00, 
    'Dr. Ananya Sharma is a senior consultant cardiologist specializing in preventive cardiology, echocardiography, hypertension management, and heart rhythm disorders.',
    NULL,
    'Apex Heart & Vascular Clinic, Suite 402, Link Road, Andheri West, Mumbai',
    NOW()
),
(
    4, 
    'Dermatology', 
    'MBBS, MD (Dermatology, Venereology & Leprosy - Grant Medical College)', 
    11, 
    800.00, 
    'Dr. Priya Nair provides expert medical and aesthetic dermatological care, focusing on chronic eczema, acne scar treatments, psoriasis, and pediatric skin conditions.',
    NULL,
    'Twacha Skin & Aesthetic Clinic, Hill Road, Bandra West, Mumbai',
    NOW()
),
(
    5, 
    'Neurology', 
    'MBBS, MD (Medicine), DM (Neurology - NIMHANS Bengaluru)', 
    16, 
    1200.00, 
    'Dr. Rohan Iyer is a senior consultant neurologist focusing on stroke rehabilitation, epilepsy management, migraine headaches, Parkinson''s disease, and neurophysiology.',
    NULL,
    'Mind & Nerve Healthcare, Central Avenue, Hiranandani Gardens, Powai, Mumbai',
    NOW()
),
(
    6, 
    'Pediatrics', 
    'MBBS, DCH, DNB (Pediatrics - Bai Jerbai Wadia Hospital for Children)', 
    12, 
    700.00, 
    'Dr. Sneha Kulkarni is known for compassionate pediatric care, specializing in newborn care, developmental assessment, childhood vaccinations, and nutrition counseling.',
    NULL,
    'Vatsalya Children''s Clinic, Gokhale Road, Dadar West, Mumbai',
    NOW()
),
(
    7, 
    'Orthopedics', 
    'MBBS, MS (Orthopedics - KEM Hospital Mumbai), Fellowship in Joint Replacement', 
    15, 
    900.00, 
    'Dr. Rahul Mehta specializes in robotic joint replacement, arthroscopic knee and shoulder surgery, sports medicine, and complex fracture care.',
    NULL,
    'Mehta Bone & Joint Clinic, S.V. Road, Goregaon West, Mumbai',
    NOW()
),
(
    8, 
    'General Medicine', 
    'MBBS, MD (General Medicine - B.J. Medical College Pune)', 
    13, 
    500.00, 
    'Dr. Arjun Deshmukh is a trusted family physician with comprehensive expertise in diabetes management, infectious diseases, preventive health screenings, and geriatric care.',
    NULL,
    'Deshmukh Family Healthcare, Teen Hath Naka, Thane West, Maharashtra',
    NOW()
),
(
    9, 
    'Gynecology', 
    'MBBS, MS (Obstetrics & Gynecology - Seth GS Medical College & KEM)', 
    10, 
    800.00, 
    'Dr. Aditi Patel is a dedicated obstetrician and gynecologist specializing in high-risk pregnancy management, adolescent health, PCOS care, and minimally invasive laparoscopic surgeries.',
    NULL,
    'Matrutva Women''s Care Clinic, Palm Beach Road, Sector 17, Vashi, Navi Mumbai, Maharashtra',
    NOW()
),
(
    10, 
    'Dentistry', 
    'BDS, MDS (Prosthodontics & Implantology - Nair Hospital Dental College)', 
    9, 
    600.00, 
    'Dr. Karan Shah provides high-precision cosmetic dentistry, dental implants, pain-free root canals, and orthodontic smile designs.',
    NULL,
    'Sparkle Dental Care, FC Road, Shivajinagar, Pune, Maharashtra',
    NOW()
);

-- Insert Availability Slots (Tomorrow onwards)
-- Dr. Ananya Sharma (doctor_id 1)
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

-- Dr. Priya Nair (doctor_id 2)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(2, CURRENT_DATE + INTERVAL '1 day', '10:00:00', '10:30:00', 30, true),
(2, CURRENT_DATE + INTERVAL '1 day', '10:30:00', '11:00:00', 30, true),
(2, CURRENT_DATE + INTERVAL '1 day', '11:30:00', '12:00:00', 30, true),
(2, CURRENT_DATE + INTERVAL '2 day', '13:00:00', '13:30:00', 30, true),
(2, CURRENT_DATE + INTERVAL '2 day', '14:00:00', '14:30:00', 30, true);

-- Dr. Rohan Iyer (doctor_id 3)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(3, CURRENT_DATE + INTERVAL '1 day', '11:00:00', '11:30:00', 30, true),
(3, CURRENT_DATE + INTERVAL '1 day', '14:30:00', '15:00:00', 30, true),
(3, CURRENT_DATE + INTERVAL '2 day', '15:00:00', '15:30:00', 30, true);

-- Dr. Sneha Kulkarni (doctor_id 4)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(4, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '09:30:00', 30, true),
(4, CURRENT_DATE + INTERVAL '1 day', '10:00:00', '10:30:00', 30, true),
(4, CURRENT_DATE + INTERVAL '2 day', '11:00:00', '11:30:00', 30, true);

-- Dr. Rahul Mehta (doctor_id 5)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(5, CURRENT_DATE + INTERVAL '1 day', '13:30:00', '14:00:00', 30, true),
(5, CURRENT_DATE + INTERVAL '2 day', '14:30:00', '15:00:00', 30, true),
(5, CURRENT_DATE + INTERVAL '3 day', '10:00:00', '10:30:00', 30, true);

-- Dr. Arjun Deshmukh (doctor_id 6)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(6, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '09:30:00', 30, true),
(6, CURRENT_DATE + INTERVAL '1 day', '11:30:00', '12:00:00', 30, true),
(6, CURRENT_DATE + INTERVAL '2 day', '10:00:00', '10:30:00', 30, true);

-- Dr. Aditi Patel (doctor_id 7)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(7, CURRENT_DATE + INTERVAL '1 day', '10:00:00', '10:30:00', 30, true),
(7, CURRENT_DATE + INTERVAL '1 day', '14:00:00', '14:30:00', 30, true),
(7, CURRENT_DATE + INTERVAL '2 day', '11:00:00', '11:30:00', 30, true);

-- Dr. Karan Shah (doctor_id 8)
INSERT INTO availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available) VALUES
(8, CURRENT_DATE + INTERVAL '1 day', '11:00:00', '11:30:00', 30, true),
(8, CURRENT_DATE + INTERVAL '1 day', '15:00:00', '15:30:00', 30, true),
(8, CURRENT_DATE + INTERVAL '2 day', '16:00:00', '16:30:00', 30, true);

-- Insert Sample Existing Appointment
-- Aarav Sharma (patient_id 1) booked slot 3 with Dr. Ananya Sharma (doctor_id 1)
INSERT INTO appointments (patient_id, doctor_id, availability_id, appointment_date, status, reason, created_at) VALUES
(1, 1, 3, (CURRENT_DATE + INTERVAL '1 day' + TIME '10:00:00')::TIMESTAMP WITH TIME ZONE, 'confirmed', 'Annual routine cardiac checkup and blood pressure review.', NOW());
