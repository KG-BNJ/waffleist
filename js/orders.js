(function () {
  const KEY = "waffle.orders.v1";

  function read() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function write(orders) {
    localStorage.setItem(KEY, JSON.stringify(orders));
  }

  function add(input) {
    const orders = read();
    const no = orders.reduce((max, order) => Math.max(max, order.no || 0), 100) + 1;
    const items = input.items.map((item) => ({
      name: item.name,
      serve: item.serve,
      qty: item.qty,
      price: item.price,
    }));
    const order = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      no,
      source: input.source,
      table: input.table,
      items,
      note: (input.note || "").trim(),
      total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
      status: "yeni",
      createdAt: Date.now(),
    };
    orders.unshift(order);
    write(orders);
    return order;
  }

  function update(id, patch) {
    const orders = read().map((order) => (order.id === id ? { ...order, ...patch } : order));
    write(orders);
    return orders.find((order) => order.id === id) || null;
  }

  window.WaffleOrders = { KEY, read, add, update };
})();
