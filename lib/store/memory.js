// For local testing only. Data disappears when the process restarts.
const leads = [];

export function memoryStore() {
  return {
    name: "memory",
    async createLead(lead) {
      const id = String(leads.length + 1);
      leads.push({ id, ...lead });
      return { id };
    },
    _all: () => leads,
  };
}
