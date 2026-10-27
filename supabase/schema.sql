-- ========================================================================
-- PEARL THOUGHTS SCHEDULE PROJECT - MEDRELLA INSPIRED APPOINTMENT SCHEMA
-- Matches schedule-project-er-diagram.png.png
-- ========================================================================

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables in reverse dependency order if resetting
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USER TABLE
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for authentication and lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- 2. PATIENT TABLE
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patients_user_id ON patients(user_id);

-- 3. DOCTOR TABLE
CREATE TABLE doctors (
    doctor_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    specialization VARCHAR(100) NOT NULL,
    qualification VARCHAR(150) NOT NULL,
    experience_years INT NOT NULL CHECK (experience_years >= 0),
    consultation_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    bio TEXT,
    avatar_url TEXT,
    clinic_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);

-- 4. AVAILABILITY TABLE
CREATE TABLE availability (
    availability_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INT NOT NULL DEFAULT 30 CHECK (slot_duration > 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_doctor_slot UNIQUE (doctor_id, available_date, start_time)
);

CREATE INDEX idx_availability_doctor_date ON availability(doctor_id, available_date);
CREATE INDEX idx_availability_status ON availability(is_available);

-- 5. APPOINTMENT TABLE
CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id INT NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    availability_id INT NOT NULL UNIQUE REFERENCES availability(availability_id) ON DELETE RESTRICT,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'rejected', 'completed')),
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

-- ========================================================================
-- ATOMIC BOOKING FUNCTION (PREVENTS RACE CONDITIONS & DOUBLE BOOKING)
-- ========================================================================
CREATE OR REPLACE FUNCTION book_appointment_atomic(
    p_patient_id INT,
    p_doctor_id INT,
    p_availability_id INT,
    p_appointment_date TIMESTAMP WITH TIME ZONE,
    p_reason TEXT
)
RETURNS TABLE (
    appointment_id INT,
    status VARCHAR(20),
    message TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_avail_record RECORD;
    v_new_appointment_id INT;
BEGIN
    -- 1. Lock the availability slot for update to avoid race conditions
    SELECT * INTO v_avail_record
    FROM availability
    WHERE availability_id = p_availability_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Availability slot does not exist.';
    END IF;

    -- 2. Verify doctor ownership
    IF v_avail_record.doctor_id <> p_doctor_id THEN
        RAISE EXCEPTION 'The selected availability slot does not belong to the chosen doctor.';
    END IF;

    -- 3. Verify slot is still available
    IF v_avail_record.is_available = FALSE THEN
        RAISE EXCEPTION 'The selected time slot has already been booked by another patient.';
    END IF;

    -- 4. Mark slot as unavailable
    UPDATE availability
    SET is_available = FALSE
    WHERE availability_id = p_availability_id;

    -- 5. Insert the appointment
    INSERT INTO appointments (
        patient_id,
        doctor_id,
        availability_id,
        appointment_date,
        status,
        reason,
        created_at
    ) VALUES (
        p_patient_id,
        p_doctor_id,
        p_availability_id,
        p_appointment_date,
        'pending',
        p_reason,
        NOW()
    ) RETURNING appointments.appointment_id INTO v_new_appointment_id;

    RETURN QUERY SELECT v_new_appointment_id, 'pending'::VARCHAR(20), 'Appointment booked successfully'::TEXT;
END;
$$;

-- ========================================================================
-- APPOINTMENT CANCELLATION RESTORATION TRIGGER
-- ========================================================================
CREATE OR REPLACE FUNCTION on_appointment_cancelled_restore_slot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('cancelled', 'rejected') AND OLD.status NOT IN ('cancelled', 'rejected') THEN
        UPDATE availability
        SET is_available = TRUE
        WHERE availability_id = NEW.availability_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restore_slot_on_cancel ON appointments;
CREATE TRIGGER trg_restore_slot_on_cancel
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION on_appointment_cancelled_restore_slot();
