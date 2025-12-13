import React, { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import "../styles/ReturnProductsForm.css";

function ReturnProductsForm() {
  const [returns] = useState([
    {
      id: 1,
      returnId: "R-1001",
      productId: "P-1234",
      productName: "Wireless Headphones",
      quantity: 1,
      condition: "Used - Good",
      reason: "Product not working properly",
      refundAmount: 1200,
      status: "completed",
      date: "2025-10-28",
      customerName: "Preethi S",
      customerEmail: "preethi@example.com",
      customerPhone: "+91 9876543210",
      sellerName: "TechMart Pvt Ltd",
      sellerEmail: "support@techmart.com",
      sellerPhone: "+91 9988776655",
    },
    {
      id: 2,
      returnId: "R-1002",
      productId: "P-5678",
      productName: "Bluetooth Speaker",
      quantity: 2,
      condition: "Opened - Like New",
      reason: "Wrong color delivered",
      refundAmount: 2200,
      status: "pending",
      date: "2025-10-27",
      customerName: "Sandy A",
      customerEmail: "sandy@example.com",
      customerPhone: "+91 9765432180",
      sellerName: "SoundWorld",
      sellerEmail: "info@soundworld.com",
      sellerPhone: "+91 9098765432",
    },
  ]);

  const columns = [
    { field: "returnId", headerName: "Return ID", width: 120 },
    { field: "productId", headerName: "Product ID", width: 120 },
    { field: "productName", headerName: "Product Name", width: 180 },
    { field: "quantity", headerName: "Qty", width: 80, type: "number" },
    { field: "condition", headerName: "Condition", width: 160 },
    { field: "refundAmount", headerName: "Refund (₹)", width: 130, type: "number" },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (params) => {
        const status = params.value.toLowerCase();
        return (
          <div
            className={`status-chip ${
              status === "completed" ? "completed" : "pending"
            }`}
          >
            {status === "completed" ? "Completed ✅" : "Pending ⏳"}
          </div>
        );
      },
    },
    { field: "date", headerName: "Date", width: 120 },
    {
      field: "customerName",
      headerName: "Customer",
      width: 220,
      renderCell: (params) => (
        <div>
          <strong>{params.row.customerName}</strong>
          <div className="sub-info">{params.row.customerEmail}</div>
          <div className="sub-info">{params.row.customerPhone}</div>
        </div>
      ),
    },
    {
      field: "sellerName",
      headerName: "Seller",
      width: 220,
      renderCell: (params) => (
        <div>
          <strong>{params.row.sellerName}</strong>
          <div className="sub-info">{params.row.sellerEmail}</div>
          <div className="sub-info">{params.row.sellerPhone}</div>
        </div>
      ),
    },
    { field: "reason", headerName: "Reason", width: 250 },
  ];

  return (
    <div className="return-form-container">
      <h1 className="page-title">📦 Return Product Management</h1>
      <p className="subtitle">Visualize all returned products with details</p>

      <div style={{ height: 500, width: "100%", backgroundColor: "#fff" }}>
        <DataGrid
          rows={returns}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5, 10]}
          disableSelectionOnClick
          sx={{
            fontFamily: "Poppins, sans-serif",
            boxShadow: 2,
            border: 1,
            borderColor: "#e0e0e0",
            "& .MuiDataGrid-cell": { alignItems: "center" },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f5f5f5",
              fontWeight: "600",
            },
          }}
        />
      </div>
    </div>
  );
}

export default ReturnProductsForm;