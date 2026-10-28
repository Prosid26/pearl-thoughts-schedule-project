"use client";

import React, { useState } from "react";
import { Doctor } from "@/types/database";
import { UserPlus } from "lucide-react";
import { AddWalkInModal } from "./AddWalkInModal";

interface Props {
  doctors: Doctor[];
}

export function ReceptionHeaderActions({ doctors }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowAddModal(true)}
        className="btn-forest text-xs px-5 py-2.5 gap-2 shadow-xs shrink-0"
      >
        <UserPlus className="w-4 h-4 text-sage" />
        <span>Check In Walk-In Patient</span>
      </button>

      <AddWalkInModal
        doctors={doctors}
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </>
  );
}
