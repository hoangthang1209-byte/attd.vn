/** Ownership-safe shell title store — used by AdminTitleProvider and unit tests. */
export type AdminTitleOwnerStore = {
  getTitle: () => string;
  setTitle: (title: string, owner: symbol) => void;
  clearTitle: (owner: symbol) => void;
};

export function createAdminTitleOwnerStore(
  onChange?: (title: string) => void,
): AdminTitleOwnerStore {
  let title = "";
  let owner: symbol | null = null;

  return {
    getTitle: () => title,
    setTitle: (next, nextOwner) => {
      owner = nextOwner;
      title = next;
      onChange?.(title);
    },
    clearTitle: (nextOwner) => {
      if (owner !== nextOwner) return;
      owner = null;
      title = "";
      onChange?.(title);
    },
  };
}
