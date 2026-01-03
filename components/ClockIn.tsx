import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  clock_in: string;
  clock_out: string | null;
  status: string;
}

interface ClockInProps {
  userId: string;
  projectId?: string;
}

const ClockIn: React.FC<ClockInProps> = ({ userId, projectId }) => {
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentEntry = async () => {
    try {
      const res = await fetch(`/api/time_entries/active/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentEntry(data || null);
      }
    } catch (err) {
      console.error("Failed to fetch current entry:", err);
    }
  };

  useEffect(() => {
    fetchCurrentEntry();
  }, []);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/time_entries/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, project_id: projectId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentEntry(data);
      }
    } catch (err) {
      console.error("Clock-in failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;
    setLoading(true);
    try {
      const res = await fetch("/api/time_entries/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_id: currentEntry.id }),
      });
      if (res.ok) {
        setCurrentEntry(null);
      }
    } catch (err) {
      console.error("Clock-out failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 transition-shadow h-[100px] flex flex-col justify-center">
      {currentEntry ? (
        <div className="flex flex-col gap-2">
          <p className="text-lg text-center">
            Clocked in at:{" "}
            <span className="font-medium">
              {new Date(currentEntry.clock_in).toLocaleTimeString()}
            </span>
          </p>
          <Button
            onClick={handleClockOut}
            disabled={loading}
            className="w-full h-10 text-lg flex justify-center items-center border-2 border-[#1c3260] bg-[#1c3260] text-white hover:bg-[#16264c]"
          >
            Clock Out
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleClockIn}
          disabled={loading}
          className="w-full h-10 text-lg flex justify-center items-center border-2 border-[#1c3260] bg-[#1c3260] text-white hover:bg-[#16264c]"
        >
          Clock In
        </Button>
      )}
    </div>
  );
};

export default ClockIn;
