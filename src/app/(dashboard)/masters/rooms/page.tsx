import { requireAuth } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DoorOpen, Plus, Lock, CheckCircle, Monitor } from "lucide-react";

export default async function RoomsMasterPage() {
  const session = await requireAuth();

  const rooms = await prisma.room.findMany({
    where: { instituteId: session.instituteId },
    orderBy: [{ building: "asc" }, { floor: "asc" }, { name: "asc" }],
  });

  const totalCap = rooms.reduce((acc, r) => acc + r.totalCapacity, 0);

  async function addRoom(formData: FormData) {
    "use server";
    const currentSession = await requireAuth();
    const name = formData.get("name") as string;
    const building = formData.get("building") as string;
    const floor = parseInt(formData.get("floor") as string, 10);
    const benchCount = parseInt(formData.get("benchCount") as string, 10);
    const seatsPerBench = parseInt(formData.get("seatsPerBench") as string, 10);
    const type = formData.get("type") as string;
    const labEquipmentCount = formData.get("labEquipmentCount")
      ? parseInt(formData.get("labEquipmentCount") as string, 10)
      : null;

    await prisma.room.create({
      data: {
        instituteId: currentSession.instituteId,
        name,
        building,
        floor,
        benchCount,
        seatsPerBench,
        totalCapacity: benchCount * seatsPerBench,
        type,
        labEquipmentCount,
      },
    });

    revalidatePath("/masters/rooms");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Examination Rooms & Labs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Classrooms and laboratories used for seating arrangements and practical exams
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200">
            Total Capacity: <span className="font-bold text-blue-700">{totalCap} seats</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Room Cards/Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{room.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          room.type === "LAB"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {room.type}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {room.building} • Floor {room.floor}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-extrabold text-blue-700">
                      {room.totalCapacity}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Total Seats</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">{room.benchCount}</span> benches ×{" "}
                    <span className="font-semibold text-slate-800">{room.seatsPerBench}</span> seats
                  </div>

                  {room.type === "LAB" && room.labEquipmentCount && (
                    <div className="flex items-center gap-1 text-purple-700 font-medium">
                      <Monitor className="w-3.5 h-3.5" />
                      {room.labEquipmentCount} PCs
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Add Room */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> Add Room / Block
          </h2>

          <form action={addRoom} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Room / Hall Name *
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Room 105, Lab 3"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Building
                </label>
                <input
                  type="text"
                  name="building"
                  required
                  defaultValue="Main Building"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Floor
                </label>
                <input
                  type="number"
                  name="floor"
                  required
                  defaultValue={1}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Bench Count
                </label>
                <input
                  type="number"
                  name="benchCount"
                  required
                  defaultValue={15}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Seats / Bench
                </label>
                <select
                  name="seatsPerBench"
                  defaultValue={2}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                >
                  <option value={1}>1 student</option>
                  <option value={2}>2 students (Alternate)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Room Type
              </label>
              <select
                name="type"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="CLASSROOM">Classroom (Theory)</option>
                <option value="LAB">Computer / Hardware Lab</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
            >
              Add Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
