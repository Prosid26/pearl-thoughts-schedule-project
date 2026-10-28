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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm shadow-teal-600/20 shrink-0"
      >
        <UserPlus className="w-4 h-4" />
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
