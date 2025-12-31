import React, { useEffect, useState } from "react";
import {
  FaSearch, FaEdit, FaTrash, FaEye, FaUserCircle, FaBuilding,
  FaMapMarkerAlt, FaCalendarAlt, FaFilter, FaUserCheck, FaDownload,
  FaPlus, FaHelicopter, FaCog, FaWrench, FaUserTie, FaBriefcase, FaTimes,
  FaPhone, FaEnvelope, FaSave, FaBan, FaCheck, FaTimesCircle, FaFileExcel, FaFileCsv, FaPrint, FaSpinner
} from "react-icons/fa";

const GRAPHQL_URL = "https://flyhub-webadmin-4.onrender.com/graphql";

export default function SellerManagement() {
  const [sellers, setSellers] = useState([]);
  const [filteredSellers, setFilteredSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("sellerId");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [productViewType, setProductViewType] = useState(null);
  const [productData, setProductData] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productCounts, setProductCounts] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRowId, setEditingRowId] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("excel");
  const [editingSeller, setEditingSeller] = useState(null);
  const [showEditSellerModal, setShowEditSellerModal] = useState(false);
  const [sellerUpdateLoading, setSellerUpdateLoading] = useState(false);
  const [selectedSellers, setSelectedSellers] = useState([]);
  const [bulkStatusUpdate, setBulkStatusUpdate] = useState("");

  const callGraphQL = async (query, variables = {}) => {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data;
  };

  // const fetchSellers = async () => {
  //   setLoading(true);
  //   setError(null);
  //   const query = `query {
  //     getSellers {
  //       customId
  //       name
  //       companyName
  //       address
  //       email
  //       phoneNumber
  //       status
  //     }
  //   }`;
  //   try {
  //     const data = await callGraphQL(query);
  //     const mapped = (data.getSellers || []).map((s, i) => ({
  //       id: i + 1,
  //       sellerId: s.customId,
  //       name: s.name || s.companyName || "Unknown",
  //       companyName: s.companyName || "",
  //       address: s.address || "",
  //       email: s.email || "",
  //       phoneNumber: s.phoneNumber || "",
  //       registrationDate: s.createdAt?.slice(0, 10) || "",
  //       status: s.status === "approved" ? "Approved" : s.status === "pending" ? "Pending" : "Suspended",
  //       raw: s,
  //     }));
  //     setSellers(mapped);
  //     setFilteredSellers(mapped);

  //     mapped.forEach(seller => fetchProductCounts(seller.sellerId));
  //   } catch (err) {
  //     setError(err.message);
  //     console.error("Error fetching sellers:", err);
  //   }
  //   setLoading(false);
  // };

  const fetchSellers = async () => {
    setLoading(true);
    setError(null);
    const query = `query {
      getSellers {
        customId
        name
        companyName
        address
        email
        phoneNumber
        status
        PANnumber
        gstNumber
        bankName
        bankAccountNumber
        bankIFCnumber
        authorized
        shippingAddresses
        pickupAddresses
        companyPan
      }
    }`;
    try {
      const data = await callGraphQL(query);
      const mapped = (data.getSellers || []).map((s, i) => ({
        id: i + 1,
        sellerId: s.customId,
        name: s.name || s.companyName || "Unknown",
        companyName: s.companyName || "",
        address: s.address || "",
        email: s.email || "",
        phoneNumber: s.phoneNumber || "",
        registrationDate: s.createdAt?.slice(0, 10) || "",
        status: s.status === "approved" ? "Approved" : s.status === "pending" ? "Pending" : "Suspended",
        PANnumber: s.PANnumber || "",
        gstNumber: s.gstNumber || "",
        bankName: s.bankName || "",
        bankAccountNumber: s.bankAccountNumber || "",
        bankIFCnumber: s.bankIFCnumber || "",
        authorized: s.authorized || "",
        shippingAddresses: s.shippingAddresses || [],
        pickupAddresses: s.pickupAddresses || [],
        companyPan: s.companyPan || "",
        raw: s,
      }));
      setSellers(mapped);
      setFilteredSellers(mapped);
      mapped.forEach(seller => fetchProductCounts(seller.sellerId));
    } catch (err) {
      setError(err.message);
      console.error("Error fetching sellers:", err);
    }
    setLoading(false);
  };

 
  const handleExport = async (format) => {
    setExporting(true);
    try {
      const dataToExport = filteredSellers.map(seller => ({
        "Seller ID": seller.sellerId,
        "Name": seller.name,
        "Company Name": seller.companyName,
        "Email": seller.email,
        "Phone": seller.phoneNumber,
        "Address": seller.address,
        "PAN Number": seller.PANnumber,
        "GST Number": seller.gstNumber,
        "Bank Name": seller.bankName,
        "Account Number": seller.bankAccountNumber,
        "IFC Code": seller.bankIFCnumber,
        "Status": seller.status,
        "Registration Date": seller.registrationDate,
        "Shipping Addresses": seller.shippingAddresses.join(", "),
        "Pickup Addresses": seller.pickupAddresses.join(", "),
      }));

      if (format === "excel" || format === "csv") {
       
        const headers = Object.keys(dataToExport[0]);
        const csvContent = [
          headers.join(","),
          ...dataToExport.map(row =>
            headers.map(header => {
              const cell = row[header];
              return typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell;
            }).join(",")
          )
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `sellers_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === "print") {
       
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <title>Seller Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .print-date { margin-bottom: 20px; color: #666; }
              </style>
            </head>
            <body>
              <h1>Seller Management Report</h1>
              <div class="print-date">Generated: ${new Date().toLocaleString()}</div>
              <table>
                <thead>
                  <tr>
                    ${Object.keys(dataToExport[0]).map(key => `<th>${key}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${dataToExport.map(row => `
                    <tr>
                      ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      }

      alert(`Export completed successfully! Format: ${format.toUpperCase()}`);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

 
  const handleUpdateSeller = async (sellerId, updateData) => {
  setSellerUpdateLoading(true);
  try {
    const mutation = `
      mutation UpdateSellerProfile($customId: String!, $input: SellerProfileInput!) {
        updateSellerProfile(customId: $customId, input: $input) {
          customId
          name
          companyName
          address
          PANnumber
          gstNumber
          bankName
          bankAccountNumber
          bankIFCnumber
          companyPan
          shippingAddresses
          pickupAddresses
        }
      }
    `;

   
    const allowedInput = {
      name: updateData.name,
      companyName: updateData.companyName,
      address: updateData.address,
      PANnumber: updateData.PANnumber,
      gstNumber: updateData.gstNumber,
      bankName: updateData.bankName,
      bankAccountNumber: updateData.bankAccountNumber,
      bankIFCnumber: updateData.bankIFCnumber,
      companyPan: updateData.companyPan,
      shippingAddresses: updateData.shippingAddresses || [],
      pickupAddresses: updateData.pickupAddresses || [],
    };

    const variables = {
      customId: sellerId,
      input: allowedInput
    };

    const data = await callGraphQL(mutation, variables);
   
    if (data.updateSellerProfile) {
      // Update local state
      setSellers(prev => prev.map(s =>
        s.sellerId === sellerId ? {
          ...s,
          name: data.updateSellerProfile.name,
          companyName: data.updateSellerProfile.companyName,
          address: data.updateSellerProfile.address,
          PANnumber: data.updateSellerProfile.PANnumber,
          gstNumber: data.updateSellerProfile.gstNumber,
          bankName: data.updateSellerProfile.bankName,
          bankAccountNumber: data.updateSellerProfile.bankAccountNumber,
          bankIFCnumber: data.updateSellerProfile.bankIFCnumber,
          companyPan: data.updateSellerProfile.companyPan,
          shippingAddresses: data.updateSellerProfile.shippingAddresses,
          pickupAddresses: data.updateSellerProfile.pickupAddresses,
        } : s
      ));

      setShowEditSellerModal(false);
      setEditingSeller(null);
      alert("Seller updated successfully!");
    }
  } catch (err) {
    console.error("Error updating seller:", err);
    alert("Failed to update seller: " + err.message);
  } finally {
    setSellerUpdateLoading(false);
  }
};

 
  const handleSelectSeller = (sellerId) => {
    setSelectedSellers(prev => {
      if (prev.includes(sellerId)) {
        return prev.filter(id => id !== sellerId);
      } else {
        return [...prev, sellerId];
      }
    });
  };

 
  const handleBulkStatusUpdate = async () => {
    if (!bulkStatusUpdate || selectedSellers.length === 0) {
      alert("Please select sellers and choose a status");
      return;
    }

    if (!window.confirm(`Are you sure you want to update ${selectedSellers.length} seller(s) to ${bulkStatusUpdate}?`)) {
      return;
    }

    try {
      const promises = selectedSellers.map(sellerId =>
        callGraphQL(`
          mutation {
            changeSellerStatus(customId: "${sellerId}", status: ${bulkStatusUpdate.toLowerCase()}) {
              customId
              status
            }
          }
        `)
      );

      await Promise.all(promises);

     
      setSellers(prev => prev.map(seller =>
        selectedSellers.includes(seller.sellerId) ? {
          ...seller,
          status: bulkStatusUpdate.charAt(0).toUpperCase() + bulkStatusUpdate.slice(1).toLowerCase()
        } : seller
      ));

      setSelectedSellers([]);
      setBulkStatusUpdate("");
      alert(`Successfully updated ${selectedSellers.length} seller(s)`);
    } catch (err) {
      console.error("Bulk update failed:", err);
      alert("Bulk update failed: " + err.message);
    }
  };

 
  const handleEditSeller = (seller) => {
    setEditingSeller({
      sellerId: seller.sellerId,
      name: seller.name,
      companyName: seller.companyName,
      email: seller.email,
      phoneNumber: seller.phoneNumber,
      address: seller.address,
      PANnumber: seller.PANnumber,
      gstNumber: seller.gstNumber,
      bankName: seller.bankName,
      bankAccountNumber: seller.bankAccountNumber,
      bankIFCnumber: seller.bankIFCnumber,
      authorized: seller.authorized,
      shippingAddresses: seller.shippingAddresses || [],
      pickupAddresses: seller.pickupAddresses || [],
      companyPan: seller.companyPan,
    });
    setShowEditSellerModal(true);
  };

 
  useEffect(() => {
    let result = [...sellers];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.sellerId.toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.address || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") result = result.filter(s => s.status === statusFilter);
    result.sort((a, b) => {
      if (sortBy === "sellerId") return a.sellerId.localeCompare(b.sellerId);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date") return new Date(b.registrationDate) - new Date(a.registrationDate);
      return 0;
    });
    setFilteredSellers(result);
  }, [searchTerm, statusFilter, sortBy, sellers]);

 
  const [showExportModal, setShowExportModal] = useState(false);
  const fetchProductCounts = async (sellerId) => {
    const query = `
    query GetSellerCounts($sellerId: String!) {
      getSellerView(sellerId: $sellerId) {
        parts { partId }
        accessories { accessoryId }
        rentals { rentalId }
        services { serviceId }
        drones { droneId }
        hirepilots { pilotId }
        hirejobs { jobId }
      }
    }
  `;

    try {
      const data = await callGraphQL(query, { sellerId });
      const view = data.getSellerView || {};

      console.log(`Counts for ${sellerId}:`, view);

      setProductCounts(prev => ({
        ...prev,
        [sellerId]: {
          drones: (view.drones || []).length,
          parts: (view.parts || []).length,
          accessories: (view.accessories || []).length,
          rentals: (view.rentals || []).length,
          services: (view.services || []).length,
          pilots: (view.hirepilots || []).length,
          jobs: (view.hirejobs || []).length,
        }
      }));
    } catch (err) {
      console.error(`Failed to fetch counts for ${sellerId}:`, err);
    }
  };

  const fetchProductsByType = async (sellerId, type) => {
    setProductLoading(true);
    setProductData([]);


    const queryFragments = {
      drones: `
      drones {
        droneId
        name
        uin
        brand
        price
        quantity
        description
        status
      }
    `,
      parts: `
      parts {
        partId
        name
        brand
        price
        description
        status
        quantity
      }
    `,
      accessories: `
      accessories {
        accessoryId
        name
        brand
        price
        description
        status
        quantity
      }
    `,
      rentals: `
      rentals {
        rentalId
        name
        brand
        location
        pricePerHour
        pricePerDay
        description
        status
      }
    `,
      services: `
      services {
        serviceId
        name
        description
        price
        location
        specificDrone
        status
        experience
      }
    `,
      pilots: `
      hirepilots {
        pilotId
        pilotName
        pilotCompany
        location
       price {
  perHour
  perDay
}
        adminStatus
        newemail  
        newphoneNumber
        specification
      }
    `,
      jobs: `
      hirejobs {
        jobId
        jobName
        companyName
        jobType
        location
        salary
        description
        status
        experience
        requirement
      }
    `
    };

   
    const query = `
    query GetSellerProducts($sellerId: String!) {
      getSellerView(sellerId: $sellerId) {
        ${queryFragments[type] || ''}
      }
    }
  `;

    console.log('Fetching products with query:', query);

    try {
      const data = await callGraphQL(query, { sellerId });
      const view = data.getSellerView || {};

     
      let products = [];
      switch (type) {
        case "drones":
          products = view.drones || [];
          break;
        case "parts":
          products = view.parts || [];
          break;
        case "accessories":
          products = view.accessories || [];
          break;
        case "rentals":
          products = view.rentals || [];
          break;
        case "services":
          products = view.services || [];
          break;
        case "pilots":
          products = view.hirepilots || [];
          break;
        case "jobs":
          products = view.hirejobs || [];
          break;
        default:
          products = [];
      }

      console.log(`Fetched ${type}:`, products);
      setProductData(products);
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setProductData([]);
    }

    setProductLoading(false);
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    let result = [...sellers];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.sellerId.toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.address || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") result = result.filter(s => s.status === statusFilter);
    result.sort((a, b) => {
      if (sortBy === "sellerId") return a.sellerId.localeCompare(b.sellerId);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date") return new Date(b.registrationDate) - new Date(a.registrationDate);
      return 0;
    });
    setFilteredSellers(result);
  }, [searchTerm, statusFilter, sortBy, sellers]);

  const handleViewDetails = (seller) => {
    setSelectedSeller(seller);
    setShowModal(true);
  };

  const handleViewProducts = (seller, type) => {
    console.log(`Viewing ${type} for seller:`, seller.sellerId);
    setSelectedSeller(seller);
    setProductViewType(type);
    setShowProductsModal(true);
    setProductSearchTerm("");
    setEditingRowId(null);
    setEditingProduct(null);
    fetchProductsByType(seller.sellerId, type);
  };

  const handleEditRow = (product) => {

    if (productViewType === "pilots") {

      if (product.price && typeof product.price === 'object') {
        product = {
          ...product,
          pricePerHour: product.price.perHour || 0,
          pricePerDay: product.price.perDay || 0
        };
      }

      product = {
        ...product,
        pricePerHour: product.pricePerHour || 0,
        pricePerDay: product.pricePerDay || 0
      };
    }

    setEditingRowId(getProductId(product));
    setEditingProduct({ ...product });
  };

  const handleSaveRow = async () => {
    if (!editingProduct || !selectedSeller) return;

    try {
      let mutation = "";
      let variables = {};

      switch (productViewType) {
        case "drones":
          mutation = `
            mutation UpdateDrone($droneId: String!, $input: UpdateDroneInput!) {
              updateDrone(droneId: $droneId, input: $input) {
                droneId
                name
                uin
                brand
                price
                quantity
                description
                status
              }
            }
          `;
          variables = {
            droneId: editingProduct.droneId,
            input: {
              name: editingProduct.name,
              brand: editingProduct.brand,
              price: parseFloat(editingProduct.price) || 0,
              description: editingProduct.description,
              status: editingProduct.status,
              quantity: parseInt(editingProduct.quantity) || 0
            }
          };
          break;
        case "parts":
          mutation = `
            mutation UpdatePart($partId: String!, $input: UpdatePartInput!) {
              updatePart(partId: $partId, input: $input) {
                partId
                name
                brand
                price
                quantity
                description
                status
              }
            }
          `;
          variables = {
            partId: editingProduct.partId,
            input: {
              name: editingProduct.name,
              brand: editingProduct.brand,
              price: parseFloat(editingProduct.price) || 0,
              description: editingProduct.description,
              status: editingProduct.status,
              quantity: parseInt(editingProduct.quantity) || 0
            }
          };
          break;
        case "accessories":
          mutation = `
            mutation UpdateAccessory($accessoryId: String!, $input: UpdateAccessoryInput!) {
              updateAccessory(accessoryId: $accessoryId, input: $input) {
                accessoryId
                name
                brand
                price
                quantity
                description
                status
              }
            }
          `;
          variables = {
            accessoryId: editingProduct.accessoryId,
            input: {
              name: editingProduct.name,
              brand: editingProduct.brand,
              price: parseFloat(editingProduct.price) || 0,
              description: editingProduct.description,
              status: editingProduct.status,
              quantity: editingProduct.quantity ? parseInt(editingProduct.quantity) : null
            }
          };
          break;
        case "services":
          mutation = `
            mutation UpdateService($serviceId: String!, $input: UpdateServiceInput!) {
              updateService(serviceId: $serviceId, input: $input) {
                serviceId
                name
                specificDrone
                experience
                price
                location
                description
                status
              }
            }
          `;
          variables = {
            serviceId: editingProduct.serviceId,
            input: {
              name: editingProduct.name,
              specificDrone: editingProduct.specificDrone,
              experience: editingProduct.experience ? parseInt(editingProduct.experience) : null,
              location: editingProduct.location,
              description: editingProduct.description,
              price: parseFloat(editingProduct.price) || 0,
              status: editingProduct.status
            }
          };
          break;
        case "rentals":
          mutation = `
            mutation UpdateRental($rentalId: String!, $input: UpdateRentalInput!) {
              updateRental(rentalId: $rentalId, input: $input) {
                rentalId
                name
                brand
                location
                pricePerHour
                pricePerDay
                description
                status
              }
            }
          `;
          variables = {
            rentalId: editingProduct.rentalId,
            input: {
              name: editingProduct.name,
              brand: editingProduct.brand,
              location: editingProduct.location,
              pricePerHour: editingProduct.pricePerHour ? parseFloat(editingProduct.pricePerHour) : null,
              pricePerDay: editingProduct.pricePerDay ? parseFloat(editingProduct.pricePerDay) : null,
              description: editingProduct.description,
              quantity: editingProduct.quantity ? parseInt(editingProduct.quantity) : null
            }
          };
          break;
        case "pilots":
          mutation = `
            mutation UpdateHirePilot($pilotId: String!, $input: UpdateHirePilotInput!) {
              updateHirePilot(pilotId: $pilotId, input: $input) {
                pilotId
                pilotName
                pilotCompany
                location
                availability
                adminStatus
                price
                {
                 perHour
                 perDay
                }
                description
                newemail
                newphoneNumber
                specification
              }
            }
          `;
          variables = {
            pilotId: editingProduct.pilotId,
            input: {
              pilotName: editingProduct.pilotName,
              pilotCompany: editingProduct.pilotCompany,
              location: editingProduct.location,
              newemail: editingProduct.newemail,
              newphoneNumber: editingProduct.newphoneNumber,
              availability: editingProduct.availability,
              specification: editingProduct.specification,
              price: {
                perHour: parseFloat(editingProduct.pricePerHour) || 0,
                perDay: parseFloat(editingProduct.pricePerDay) || 0,
              },
              description: editingProduct.description,
              adminStatus: editingProduct.adminStatus,
            },
          };
          break;
        case "jobs":
          mutation = `
            mutation UpdateJob($jobId: String!, $input: UpdateJobInput!) {
              updateJob(jobId: $jobId, input: $input) {
                jobId
                jobName
                companyName
                jobType
                experience
                location
                salary
                description
                requirement
                status
              }
            }
          `;
          variables = {
            jobId: editingProduct.jobId,
            input: {
              jobName: editingProduct.jobName,
              companyName: editingProduct.companyName,
              jobType: editingProduct.jobType,
              experience: editingProduct.experience,
              location: editingProduct.location,
              salary: editingProduct.salary,
              description: editingProduct.description,
              requirement: editingProduct.requirement,
              status: editingProduct.status
            }
          };
          break;
        default:
          alert(`Update functionality for ${productViewType} coming soon!`);
          return;
      }

      await callGraphQL(mutation, variables);

      // Update local state
      setProductData(prev =>
        prev.map(p =>
          getProductId(p) === editingRowId ? editingProduct : p
        )
      );

      setEditingRowId(null);
      setEditingProduct(null);
      alert("Product updated successfully!");
    } catch (err) {
      console.error("Error updating product:", err);
      alert("Failed to update product: " + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (product) => {
    if (
      !product ||
      !selectedSeller ||
      !window.confirm(
        `Are you sure you want to delete this ${productViewType.slice(0, -1)}?`
      )
    )
      return;

    try {
      let mutation = "";
      let variables = {};

      switch (productViewType) {
        case "drones":
          mutation = `
          mutation DeleteDrone($droneId: String!) {
            deleteDrone(droneId: $droneId) {
              droneId
            }
          }
        `;
          variables = { droneId: product.droneId };
          break;

        case "parts":
          mutation = `
          mutation DeletePart($partId: String!) {
            deletePart(partId: $partId) {
              partId
            }
          }
        `;
          variables = { partId: product.partId };
          break;

        case "accessories":
          mutation = `
          mutation DeleteAccessory($accessoryId: String!) {
            deleteAccessory(accessoryId: $accessoryId) {
              accessoryId
            }
          }
        `;
          variables = { accessoryId: product.accessoryId };
          break;

        case "rentals":
          mutation = `
          mutation DeleteRental($rentalId: String!) {
            deleteRental(rentalId: $rentalId) {
              rentalId
            }
          }
        `;
          variables = { rentalId: product.rentalId };
          break;

        case "services":
          mutation = `
          mutation DeleteService($serviceId: String!) {
            deleteService(serviceId: $serviceId) {
              serviceId
            }
          }
        `;
          variables = { serviceId: product.serviceId };
          break;

        case "pilots":
          mutation = `
          mutation DeleteHirePilot($pilotId: String!) {
            deleteHirePilot(pilotId: $pilotId) {
              success
              message
            }
          }
        `;
          variables = { pilotId: product.pilotId };
          break;

        case "jobs":
          mutation = `
          mutation DeleteJob($jobId: String!) {
            deleteJob(jobId: $jobId) {
              jobId
            }
          }
        `;
          variables = { jobId: product.jobId };
          break;

        default:
          alert(`Delete functionality for ${productViewType} is not supported.`);
          return;
      }

      await callGraphQL(mutation, variables);

      // Update UI state
      setProductData(prev =>
        prev.filter(p => getProductId(p) !== getProductId(product))
      );

      setProductCounts(prev => ({
        ...prev,
        [selectedSeller.sellerId]: {
          ...prev[selectedSeller.sellerId],
          [productViewType]:
            (prev[selectedSeller.sellerId]?.[productViewType] || 0) - 1,
        },
      }));

      alert("Product deleted successfully!");
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product: " + err.message);
    }
  };


  const handleDelete = async (id) => {
    const seller = sellers.find(s => s.id === id);
    if (!seller || !window.confirm(`Delete ${seller.sellerId}?`)) return;
    try {
      await callGraphQL(`mutation { deleteSeller(customId: "${seller.sellerId}") { customId } }`);
      setSellers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  const getProductId = (product) => {
    switch (productViewType) {
      case "drones": return product.droneId;
      case "parts": return product.partId;
      case "accessories": return product.accessoryId;
      case "rentals": return product.rentalId;
      case "services": return product.serviceId;
      case "pilots": return product.pilotId;
      case "jobs": return product.jobId;
      default: return product.id;
    }
  };

  const handleInputChange = (field, value) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredProducts = productData.filter(item =>
    !productSearchTerm || JSON.stringify(item).toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const productLabels = {
    drones: "Drones",
    parts: "Parts",
    accessories: "Accessories",
    rentals: "Rentals",
    services: "Services",
    pilots: "Pilots",
    jobs: "Jobs"
  };
  const productTypes = ["drones", "parts", "accessories", "rentals", "services", "pilots", "jobs"];
  const productIcons = {
    drones: FaHelicopter,
    parts: FaCog,
    accessories: FaCog,
    rentals: FaHelicopter,
    services: FaWrench,
    pilots: FaUserTie,
    jobs: FaBriefcase
  };

  const totalProducts = Object.values(productCounts).reduce((sum, counts) =>
    sum + Object.values(counts).reduce((a, b) => a + b, 0), 0
  );

  const renderProductCell = (seller, type) => {
    const count = productCounts[seller.sellerId]?.[type] || 0;
    const IconComponent = productIcons[type];

    return (
      <td key={type} className="product-cell">
        <button
          className="product-count-btn"
          onClick={() => {
            console.log(`Clicked ${type} for ${seller.sellerId}, count: ${count}`); // Debug
            handleViewProducts(seller, type);
          }}
          title={`View ${productLabels[type]} (${count})`}
          disabled={count === 0}
        >
          <IconComponent className="product-icon-cell" />
          <span className="product-count-value">{count}</span>
        </button>
      </td>
    );
  };

 
  const renderProductDetails = (product) => {
    const isEditing = editingRowId === getProductId(product);

    const renderActionCell = () => (
      <td className="action-cell">
        <div className="action-buttons">
          {isEditing ? (
            <>
              <button className="action-btn save-btn" onClick={handleSaveRow}>
                <FaCheck />
              </button>
              <button className="action-btn cancel-btn" onClick={handleCancelEdit}>
                <FaTimes />
              </button>
            </>
          ) : (
            <>
              <button className="action-btn edit-btn" onClick={() => handleEditRow(product)}>
                <FaEdit />
              </button>
              <button className="action-btn delete-btn" onClick={() => handleDeleteProduct(product)}>
                <FaTrash />
              </button>
            </>
          )}
        </div>
      </td>
    );

    switch (productViewType) {
      case "drones":
        return (
          <>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.droneId || ""}
                  onChange={(e) => handleInputChange("droneId", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.droneId
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.name
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.uin || ""}
                  onChange={(e) => handleInputChange("uin", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.uin
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.brand || ""}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.brand
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.price || ""}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                `₹${product.price}`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.quantity || ""}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.quantity
              )}
            </td>
            <td>
              {isEditing ? (
                <select
                  value={editingProduct.status || ""}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="sheet-select"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              ) : (
                <span className={`status-select status-${product.status?.toLowerCase()}`}>
                  {product.status}
                </span>
              )}
            </td>
            <td>
              {isEditing ? (
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="sheet-textarea"
                />
              ) : (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.description || "No description"}
                </div>
              )}
            </td>
            {renderActionCell()}
          </>
        );

      case "parts":
        return (
          <>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.partId || ""}
                  onChange={(e) => handleInputChange("partId", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.partId
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.name
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.brand || ""}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.brand
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.price || ""}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                `₹${product.price}`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.quantity || ""}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.quantity
              )}
            </td>
            <td>
              {isEditing ? (
                <select
                  value={editingProduct.status || ""}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="sheet-select"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              ) : (
                <span className={`status-select status-${product.status?.toLowerCase()}`}>
                  {product.status}
                </span>
              )}
            </td>
            <td>
              {isEditing ? (
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="sheet-textarea"
                />
              ) : (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.description || "No description"}
                </div>
              )}
            </td>
            {renderActionCell()}
          </>
        );

      case "accessories":
        return (
          <>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.accessoryId || ""}
                  onChange={(e) => handleInputChange("accessoryId", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.accessoryId
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.name
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.brand || ""}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.brand
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.price || ""}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                `₹${product.price}`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.quantity || ""}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.quantity
              )}
            </td>
            <td>
              {isEditing ? (
                <select
                  value={editingProduct.status || ""}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="sheet-select"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              ) : (
                <span className={`status-select status-${product.status?.toLowerCase()}`}>
                  {product.status}
                </span>
              )}
            </td>
            <td>
              {isEditing ? (
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="sheet-textarea"
                />
              ) : (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.description || "No description"}
                </div>
              )}
            </td>
            {renderActionCell()}
          </>
        );

      case "rentals":
        return (
          <>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.rentalId || ""}
                  onChange={(e) => handleInputChange("rentalId", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.rentalId
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.name
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.brand || ""}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.brand
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.pricePerHour || ""}
                  onChange={(e) => handleInputChange("pricePerHour", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                `₹${product.pricePerHour}/hr`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.pricePerDay || ""}
                  onChange={(e) => handleInputChange("pricePerDay", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                `₹${product.pricePerDay}/day`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.location
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.quantity || ""}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.quantity
              )}
            </td>
            <td>
              {isEditing ? (
                <select
                  value={editingProduct.status || ""}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="sheet-select"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              ) : (
                <span className={`status-select status-${product.status?.toLowerCase()}`}>
                  {product.status}
                </span>
              )}
            </td>
            <td>
              {isEditing ? (
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="sheet-textarea"
                />
              ) : (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.description || "No description"}
                </div>
              )}
            </td>
            {renderActionCell()}
          </>
        );

      case "services":
        return (
          <>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.serviceId || ""}
                  onChange={(e) => handleInputChange("serviceId", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.serviceId
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.name
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.price || ""}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                `₹${product.price}`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.location
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.specificDrone || ""}
                  onChange={(e) => handleInputChange("specificDrone", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.specificDrone || "N/A"
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.experience || ""}
                  onChange={(e) => handleInputChange("experience", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.experience || "N/A"
              )}
            </td>
            <td>
              {isEditing ? (
                <select
                  value={editingProduct.status || ""}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="sheet-select"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              ) : (
                <span className={`status-select status-${product.status?.toLowerCase()}`}>
                  {product.status}
                </span>
              )}
            </td>
            <td>
              {isEditing ? (
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="sheet-textarea"
                />
              ) : (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.description || "No description"}
                </div>
              )}
            </td>
            {renderActionCell()}
          </>
        );

      case "pilots":
        return (
          <>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.pilotId || ""}
                  onChange={(e) => handleInputChange("pilotId", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.pilotId
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.pilotName || ""}
                  onChange={(e) => handleInputChange("pilotName", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.pilotName
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.pilotCompany || ""}
                  onChange={(e) => handleInputChange("pilotCompany", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.pilotCompany
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.pricePerHour || ""}
                  onChange={(e) => handleInputChange("pricePerHour", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                // Handle nested price object
                `₹${product.price?.perHour || product.pricePerHour || 0}/hr`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.pricePerDay || ""}
                  onChange={(e) => handleInputChange("pricePerDay", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                // Handle nested price object
                `₹${product.price?.perDay || product.pricePerDay || 0}/day`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.location
              )}
            </td>
            <td>
              {isEditing ? (
                <select
                  value={editingProduct.adminStatus || ""}
                  onChange={(e) => handleInputChange("adminStatus", e.target.value)}
                  className="sheet-select"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              ) : (
                <span className={`status-select status-${product.adminStatus?.toLowerCase()}`}>
                  {product.adminStatus}
                </span>
              )}
            </td>
            <td>
              {isEditing ? (
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="sheet-textarea"
                />
              ) : (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.description || "No description"}
                </div>
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="email"
                  value={editingProduct.newemail || ""}
                  onChange={(e) => handleInputChange("newemail", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.newemail || "N/A"
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.newphoneNumber || ""}
                  onChange={(e) => handleInputChange("newphoneNumber", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.newphoneNumber || "N/A"
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.specification || ""}
                  onChange={(e) => handleInputChange("specification", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.specification || "N/A"
              )}
            </td>
            {renderActionCell()}
          </>
        );
      case "jobs":
        return (
          <>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.jobId || ""}
                  onChange={(e) => handleInputChange("jobId", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.jobId
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.jobName || ""}
                  onChange={(e) => handleInputChange("jobName", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.jobName
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.companyName || ""}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.companyName
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="number"
                  value={editingProduct.salary || ""}
                  onChange={(e) => handleInputChange("salary", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                `₹${product.salary}`
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.location
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.experience || ""}
                  onChange={(e) => handleInputChange("experience", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.experience || "N/A"
              )}
            </td>
            <td>
              {isEditing ? (
                <select
                  value={editingProduct.status || ""}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="sheet-select"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              ) : (
                <span className={`status-select status-${product.status?.toLowerCase()}`}>
                  {product.status}
                </span>
              )}
            </td>
            <td>
              {isEditing ? (
                <textarea
                  value={editingProduct.description || ""}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="sheet-textarea"
                />
              ) : (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.description || "No description"}
                </div>
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.jobType || ""}
                  onChange={(e) => handleInputChange("jobType", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.jobType || "N/A"
              )}
            </td>
            <td>
              {isEditing ? (
                <input
                  type="text"
                  value={editingProduct.requirement || ""}
                  onChange={(e) => handleInputChange("requirement", e.target.value)}
                  className="sheet-input"
                />
              ) : (
                product.requirement || "N/A"
              )}
            </td>
            {renderActionCell()}
          </>
        );

      default:
        return <td colSpan="10">Product type not supported</td>;
    }
  };

  if (loading) return (
    <div className="seller-details-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⚙️</div>
        <p style={{ fontSize: '16px', color: '#718096' }}>Loading sellers...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="seller-details-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '18px', color: '#ff4d4f', marginBottom: '16px' }}>❌ Error: {error}</p>
        <button onClick={fetchSellers} className="btn btn-add">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="seller-details-container">
      <style>{`
         @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
 
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
 
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  * {
    box-sizing: border-box;
  }
 
  .seller-details-container {
    padding: 24px;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  .seller-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .header-content h1 {
    margin: 0;
    font-size: 28px;
    color: #1a202c;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-content p {
    margin: 8px 0 0 0;
    color: #718096;
    font-size: 14px;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }

  .btn-export {
    background: #e6f7ff;
    color: #0050b3;
  }

  .btn-export:hover {
    background: #0050b3;
    color: white;
  }

  .btn-add {
    background: #0050b3;
    color: white;
  }

  .btn-add:hover {
    background: #003d82;
  }

  .stats-overview {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 30px;
  }

  .stat-card {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 15px;
    transition: transform 0.3s ease;
  }

  .stat-card:hover {
    transform: translateY(-5px);
  }

  .stat-icon {
    font-size: 30px;
    color: #4299e1;
  }

  .stat-info {
    flex: 1;
  }

  .stat-info h3 {
    margin: 0;
    font-size: 14px;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-number {
    margin: 5px 0;
    font-size: 24px;
    font-weight: 700;
    color: #2d3748;
  }

  .stat-change {
    font-size: 12px;
    color: #a0aec0;
  }

  .filters-section {
    background: white;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    margin-bottom: 30px;
  }

  .search-container {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .search-box {
    flex: 1;
    display: flex;
    align-items: center;
    background: #f7fafc;
    border-radius: 8px;
    padding: 10px 15px;
    border: 1px solid #e2e8f0;
  }

  .search-icon {
    color: #a0aec0;
    margin-right: 10px;
  }

  .search-input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 14px;
    color: #2d3748;
  }

  .filter-controls {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .filter-group label {
    font-size: 14px;
    color: #4a5568;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .filter-select {
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #4a5568;
    font-size: 14px;
    outline: none;
    cursor: pointer;
  }

  .sellers-table-section {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  .table-header {
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .table-header h3 {
    margin: 0;
    font-size: 18px;
    color: #1a202c;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .count-badge {
    background: #e6f7ff;
    color: #0050b3;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
  }

  .table-summary {
    color: #718096;
    font-size: 14px;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .sellers-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    min-width: 1200px;
  }

  .sellers-table th, .sellers-table td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
  }

  .sellers-table th {
    background-color: #f8f9fa;
    font-weight: 600;
    color: #2d3748;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .sellers-table tr:hover {
    background-color: #f7fafc;
  }

  .product-cell {
    text-align: center;
  }

  .product-count-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 20px;
    background-color: #e6f7ff;
    color: #0050b3;
    border: none;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    font-size: 12px;
  }

  .product-count-btn:hover:not(:disabled) {
    background-color: #0050b3;
    color: white;
  }

  .product-count-btn:disabled {
    background-color: #f1f1f1;
    color: #a0a0a0;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .product-count-value {
    background: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
  }

  .seller-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .seller-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #718096;
  }

  .seller-details h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #2d3748;
  }

  .seller-details p {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #718096;
  }

  .status-badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: inline-block;
  }

  .status-active {
    background-color: #d4edda;
    color: #155724;
  }

  .status-pending {
    background-color: #fef5e7;
    color: #d68910;
  }

  .status-suspended {
    background-color: #f8d7da;
    color: #721c24;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
  }

  .view-btn {
    background-color: #e6f7ff;
    color: #0050b3;
  }

  .edit-btn {
    background-color: #fef5e7;
    color: #d68910;
  }

  .delete-btn {
    background-color: #fff1f0;
    color: #ff4d4f;
  }

  .action-btn:hover {
    opacity: 0.8;
    transform: scale(1.05);
  }

  /* Full Screen Modal Styles */
  .fullscreen-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    flex-direction: column;
    z-index: 2000;
    animation: fadeIn 0.3s ease-out;
  }

  .modal-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: #1a202c;
    color: white;
    border-bottom: 1px solid #2d3748;
  }

  .modal-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 600;
  }

  .modal-close-btn {
    background: #4a5568;
    border: none;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 20px;
  }

  .modal-close-btn:hover {
    background: #718096;
    transform: rotate(90deg);
  }

  .modal-content-wrapper {
    flex: 1;
    padding: 24px;
    overflow: auto;
    background: #f7fafc;
  }

  .google-sheets-table {
    width: 100%;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border-collapse: collapse;
    min-width: 1200px;
  }

  .google-sheets-table thead {
    background: #f8f9fa;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .google-sheets-table th {
    padding: 16px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e2e8f0;
    background: #f8f9fa;
    white-space: nowrap;
    min-width: 120px;
  }

  .google-sheets-table td {
    padding: 14px 16px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
    color: #2d3748;
    vertical-align: middle;
    transition: all 0.2s;
  }

  .google-sheets-table tr:hover {
    background: #f0f7ff;
  }

  .google-sheets-table tr.editing {
    background: #f0fff4;
  }

  .action-cell {
    min-width: 140px;
    white-space: nowrap;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .sheet-input {
    width: 100%;
    padding: 8px 12px;
    border: 2px solid #4299e1;
    border-radius: 4px;
    font-size: 13px;
    background: white;
    transition: all 0.2s;
    font-family: inherit;
  }

  .sheet-input:focus {
    outline: none;
    border-color: #0050b3;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
  }

  .sheet-select {
    width: 100%;
    padding: 8px 12px;
    border: 2px solid #4299e1;
    border-radius: 4px;
    font-size: 13px;
    background: white;
    cursor: pointer;
    font-family: inherit;
  }

  .save-btn {
    background: #d4edda;
    color: #155724;
  }

  .save-btn:hover {
    background: #155724;
    color: white;
    transform: scale(1.05);
  }

  .cancel-btn {
    background: #fef5e7;
    color: #d68910;
  }

  .cancel-btn:hover {
    background: #d68910;
    color: white;
    transform: scale(1.05);
  }

  .delete-btn {
    background: #fff1f0;
    color: #ff4d4f;
  }

  .delete-btn:hover {
    background: #ff4d4f;
    color: white;
    transform: scale(1.05);
  }

  .search-controls {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .search-controls .search-box {
    flex: 1;
  }

  .stats-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #e6f7ff;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    color: #0050b3;
    font-weight: 600;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 100;
    border-radius: 8px;
  }

  .loading-spinner {
    font-size: 48px;
    margin-bottom: 16px;
    animation: spin 1s linear infinite;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #718096;
  }

  .empty-state p {
    font-size: 16px;
    margin: 0;
  }

  .status-select {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    width: 100%;
  }

  .status-active {
    background: #d4edda;
    color: #155724;
  }

  .status-pending {
    background: #fef5e7;
    color: #d68910;
  }

  .status-suspended {
    background: #f8d7da;
    color: #721c24;
  }

  .status-approved {
    background: #d4edda;
    color: #155724;
  }

  .status-rejected {
    background: #f8d7da;
    color: #721c24;
  }

  /* Scrollbar Styling */
  .modal-content-wrapper::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .modal-content-wrapper::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .modal-content-wrapper::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  .modal-content-wrapper::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }

  @media (max-width: 1024px) {
    .stats-overview {
      grid-template-columns: repeat(2, 1fr);
    }
    .search-container {
      flex-direction: column;
      align-items: stretch;
    }
  }

  @media (max-width: 640px) {
    .stats-overview {
      grid-template-columns: 1fr;
    }
    .seller-header {
      flex-direction: column;
      gap: 20px;
      align-items: flex-start;
    }
    .header-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
    .export-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 12px;
          min-width: 200px;
          z-index: 1000;
          margin-top: 8px;
        }

        .export-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .export-option:hover {
          background: #f7fafc;
        }

        .seller-edit-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
        }

        .seller-edit-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 14px;
          font-weight: 600;
          color: #4a5568;
        }

        .form-input {
          padding: 10px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .form-input:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
        }

        .bulk-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          background: #f7fafc;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }

        .selected-count {
          background: #0050b3;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .export-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4000;
        }

        .export-modal-content {
          background: white;
          border-radius: 12px;
          padding: 30px;
          width: 90%;
          max-width: 500px;
        }

        .export-format-options {
          display: flex;
          gap: 12px;
          margin: 20px 0;
        }

        .export-format-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 20px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-format-btn:hover {
          border-color: #4299e1;
          background: #f0f7ff;
        }

        .export-format-btn.selected {
          border-color: #0050b3;
          background: #e6f7ff;
        }

        .export-format-icon {
          font-size: 32px;
        }

        .export-format-label {
          font-size: 14px;
          font-weight: 600;
          color: #2d3748;
        }
      `}</style>

      {/* Header */}
      {/* <div className="seller-header">
        <div className="header-content">
          <h1><FaMapMarkerAlt /> Seller Management</h1>
          <p>Manage sellers and view their products</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-export" onClick={() => alert("Export feature coming soon!")}>
            <FaDownload /> Export
          </button>
          <button className="btn btn-add" onClick={() => alert("Add seller form coming soon!")}>
            <FaPlus /> Add Seller
          </button>
        </div>
      </div> */}
      <div className="seller-header">
        <div className="header-content">
          <h1><FaMapMarkerAlt /> Seller Management</h1>
          <p>Manage sellers and view their products</p>
        </div>
        <div className="header-actions">
          {/* Export Button with Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-export"
              onClick={() => setShowExportModal(true)}
              disabled={exporting}
            >
              {exporting ? <FaSpinner className="fa-spin" /> : <FaDownload />}
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>

          <button className="btn btn-add" onClick={() => alert("Add seller form coming soon!")}>
            <FaPlus /> Add Seller
          </button>
        </div>
      </div>

      {/* Bulk Actions Section */}
      {selectedSellers.length > 0 && (
        <div className="bulk-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="selected-count">{selectedSellers.length} selected</span>
            <button
              className="btn"
              onClick={() => setSelectedSellers([])}
              style={{ background: '#f1f1f1', color: '#666' }}
            >
              Clear
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', gap: '12px' }}>
            <select
              value={bulkStatusUpdate}
              onChange={(e) => setBulkStatusUpdate(e.target.value)}
              className="filter-select"
              style={{ flex: 1 }}
            >
              <option value="">Update Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              className="btn btn-add"
              onClick={handleBulkStatusUpdate}
              disabled={!bulkStatusUpdate}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="export-modal" onClick={() => setShowExportModal(false)}>
          <div className="export-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#1a202c' }}>Export Data</h3>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
                <FaTimes />
              </button>
            </div>

            <p style={{ color: '#718096', marginBottom: '20px' }}>
              Choose export format for {filteredSellers.length} seller(s)
            </p>

            <div className="export-format-options">
              <div
                className={`export-format-btn ${exportFormat === 'excel' ? 'selected' : ''}`}
                onClick={() => {
                  setExportFormat('excel');
                  handleExport('excel');
                  setShowExportModal(false);
                }}
              >
                <FaFileExcel className="export-format-icon" style={{ color: '#217346' }} />
                <span className="export-format-label">Excel/CSV</span>
              </div>

              <div
                className={`export-format-btn ${exportFormat === 'print' ? 'selected' : ''}`}
                onClick={() => {
                  setExportFormat('print');
                  handleExport('print');
                  setShowExportModal(false);
                }}
              >
                <FaPrint className="export-format-icon" style={{ color: '#4a5568' }} />
                <span className="export-format-label">Print</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seller Edit Modal */}
      {showEditSellerModal && editingSeller && (
        <div className="seller-edit-modal" onClick={() => setShowEditSellerModal(false)}>
          <div className="seller-edit-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top-bar">
              <div className="modal-title">
                <FaEdit /> Edit Seller: {editingSeller.name}
              </div>
              <button className="modal-close-btn" onClick={() => setShowEditSellerModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleUpdateSeller(editingSeller.sellerId, {
                  name: editingSeller.name,
                  companyName: editingSeller.companyName,
                  email: editingSeller.email,
                  phoneNumber: editingSeller.phoneNumber,
                  address: editingSeller.address,
                  PANnumber: editingSeller.PANnumber,
                  gstNumber: editingSeller.gstNumber,
                  bankName: editingSeller.bankName,
                  bankAccountNumber: editingSeller.bankAccountNumber,
                  bankIFCnumber: editingSeller.bankIFCnumber,
                  authorized: editingSeller.authorized,
                  shippingAddresses: editingSeller.shippingAddresses,
                  pickupAddresses: editingSeller.pickupAddresses,
                  companyPan: editingSeller.companyPan
                });
              }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Seller Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSeller.name}
                      onChange={(e) => setEditingSeller({ ...editingSeller, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSeller.companyName}
                      onChange={(e) => setEditingSeller({ ...editingSeller, companyName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={editingSeller.email}
                      onChange={(e) => setEditingSeller({ ...editingSeller, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={editingSeller.phoneNumber}
                      onChange={(e) => setEditingSeller({ ...editingSeller, phoneNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-input"
                      value={editingSeller.address}
                      onChange={(e) => setEditingSeller({ ...editingSeller, address: e.target.value })}
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">PAN Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSeller.PANnumber}
                      onChange={(e) => setEditingSeller({ ...editingSeller, PANnumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSeller.gstNumber}
                      onChange={(e) => setEditingSeller({ ...editingSeller, gstNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSeller.bankName}
                      onChange={(e) => setEditingSeller({ ...editingSeller, bankName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSeller.bankAccountNumber}
                      onChange={(e) => setEditingSeller({ ...editingSeller, bankAccountNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">IFC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editingSeller.bankIFCnumber}
                      onChange={(e) => setEditingSeller({ ...editingSeller, bankIFCnumber: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowEditSellerModal(false)}
                    style={{ background: '#f1f1f1', color: '#666' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-add"
                    disabled={sellerUpdateLoading}
                  >
                    {sellerUpdateLoading ? <FaSpinner className="fa-spin" /> : <FaSave />}
                    {sellerUpdateLoading ? 'Updating...' : 'Update Seller'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Update the Sellers Table to include checkbox and edit button */}
      <div className="sellers-table-section">
        <div className="table-header">
          <h3>
            <FaBuilding /> Seller Directory
            <span className="count-badge">{filteredSellers.length}</span>
          </h3>
          <div className="table-summary">
            Showing {filteredSellers.length} of {sellers.length} sellers
          </div>
        </div>

        <div className="table-wrapper">
          <table className="sellers-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <input
                    type="checkbox"
                    checked={selectedSellers.length === filteredSellers.length && filteredSellers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSellers(filteredSellers.map(s => s.sellerId));
                      } else {
                        setSelectedSellers([]);
                      }
                    }}
                  />
                </th>
                <th>ID</th>
                <th>Seller Info</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.map((seller) => (
                <tr key={seller.id} className="seller-row">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSellers.includes(seller.sellerId)}
                      onChange={() => handleSelectSeller(seller.sellerId)}
                    />
                  </td>
                  <td>
                    <div className="seller-id-badge">
                      <FaUserCircle />
                      {seller.sellerId}
                    </div>
                  </td>
                  {/* ... rest of table cells ... */}
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleViewDetails(seller)}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEditSeller(seller)}
                        title="Edit Seller"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(seller.id)}
                        title="Delete Seller"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon"><FaMapMarkerAlt /></div>
          <div className="stat-info">
            <h3>Total Sellers</h3>
            <p className="stat-number">{sellers.length}</p>
            <span className="stat-change">All registered</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaUserCheck /></div>
          <div className="stat-info">
            <h3>Active Sellers</h3>
            <p className="stat-number">{sellers.filter(s => s.status === "Active").length}</p>
            <span className="stat-change">
              {sellers.length ? Math.round((sellers.filter(s => s.status === "Active").length / sellers.length) * 100) : 0}% of total
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaCalendarAlt /></div>
          <div className="stat-info">
            <h3>Pending</h3>
            <p className="stat-number">{sellers.filter(s => s.status === "Pending").length}</p>
            <span className="stat-change">Awaiting approval</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaBuilding /></div>
          <div className="stat-info">
            <h3>Total Products</h3>
            <p className="stat-number">{totalProducts}</p>
            <span className="stat-change">Across all sellers</span>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="search-container">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by ID, name, email or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-controls">
            <div className="filter-group">
              <label><FaFilter /> Filter by Status:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                {["All", "Active", "Pending", "Approved", "Suspended"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Sort by:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                <option value="sellerId">Seller ID</option>
                <option value="name">Seller Name</option>
                <option value="date">Registration Date</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="sellers-table-section">
        <div className="table-header">
          <h3>
            <FaBuilding /> Seller Directory
            <span className="count-badge">{filteredSellers.length}</span>
          </h3>
          <div className="table-summary">
            Showing {filteredSellers.length} of {sellers.length} sellers
          </div>
        </div>

        <div className="table-wrapper">
          <table className="sellers-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Seller Info</th>
                <th>Email</th>
                <th style={{ color: '#4299e1' }}>
                  <FaHelicopter /> Drones
                </th>
                <th style={{ color: '#4299e1' }}>
                  <FaCog /> Parts
                </th>
                <th style={{ color: '#4299e1' }}>
                  <FaCog /> Accessories
                </th>
                <th style={{ color: '#4299e1' }}>
                  <FaHelicopter /> Rentals
                </th>
                <th style={{ color: '#4299e1' }}>
                  <FaWrench /> Services
                </th>
                <th style={{ color: '#4299e1' }}>
                  <FaUserTie /> Pilots
                </th>
                <th style={{ color: '#4299e1' }}>
                  <FaBriefcase /> Jobs
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.map((seller) => (
                <tr key={seller.id} className="seller-row">
                  <td>
                    <div className="seller-id-badge">
                      <FaUserCircle />
                      {seller.sellerId}
                    </div>
                  </td>

                  <td>
                    <div className="seller-info">
                      <div className="seller-avatar">
                        <FaUserCircle />
                      </div>
                      <div className="seller-details">
                        <h4>{seller.name}</h4>
                        <p>{seller.companyName || "N/A"}</p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#4299e1'
                      }}
                    >
                      <FaEnvelope />
                      <span title={seller.email}>
                        {seller.email ? seller.email.split('@')[0] + '...' : "N/A"}
                      </span>
                    </div>
                  </td>

                  {productTypes.map(type => renderProductCell(seller, type))}

                  <td>
                    <span className={`status-badge status-${seller.status.toLowerCase()}`}>
                      {seller.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn view-btn"
                        onClick={() => handleViewDetails(seller)}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => alert("Edit functionality coming soon!")}
                        title="Edit Seller"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(seller.id)}
                        title="Delete Seller"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Screen Products Modal */}
      {showProductsModal && selectedSeller && (
        <div className="fullscreen-modal">
          <div className="modal-top-bar">
            <div className="modal-title">
              {productIcons[productViewType] && React.createElement(productIcons[productViewType])}
              {productLabels[productViewType]} - {selectedSeller.name}
              <span className="stats-summary">
                <FaBuilding /> {filteredProducts.length} items
              </span>
            </div>
            <button className="modal-close-btn" onClick={() => setShowProductsModal(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="modal-content-wrapper">
            <div className="search-controls">
              <div className="search-box">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder={`Search ${productLabels[productViewType]}...`}
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {productLoading ? (
              <div className="loading-overlay">
                <div className="loading-spinner">⚙️</div>
                <p>Loading {productLabels[productViewType]}...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p>No {productLabels[productViewType]} found for this seller</p>
              </div>
            ) : (
              <div style={{ overflow: 'auto', borderRadius: '8px' }}>
                <table className="google-sheets-table">
                  <thead>
                    <tr>
                      {productViewType === "drones" && (
                        <>
                          <th>DRONE ID</th>
                          <th>NAME</th>
                          <th>UIN</th>
                          <th>BRAND</th>
                          <th>PRICE</th>
                          <th>QUANTITY</th>
                          <th>STATUS</th>
                          <th>DESCRIPTION</th>
                          <th>ACTIONS</th>
                        </>
                      )}
                      {productViewType === "parts" && (
                        <>
                          <th>PART ID</th>
                          <th>NAME</th>
                          <th>BRAND</th>
                          <th>PRICE</th>
                          <th>QUANTITY</th>
                          <th>STATUS</th>
                          <th>DESCRIPTION</th>
                          <th>ACTIONS</th>
                        </>
                      )}
                      {productViewType === "accessories" && (
                        <>
                          <th>ACCESSORY ID</th>
                          <th>NAME</th>
                          <th>BRAND</th>
                          <th>PRICE</th>
                          <th>QUANTITY</th>
                          <th>STATUS</th>
                          <th>DESCRIPTION</th>
                          <th>ACTIONS</th>
                        </>
                      )}
                      {productViewType === "rentals" && (
                        <>
                          <th>RENTAL ID</th>
                          <th>NAME</th>
                          <th>BRAND</th>
                          <th>PRICE/HOUR</th>
                          <th>PRICE/DAY</th>
                          <th>LOCATION</th>
                          <th>QUANTITY</th>
                          <th>STATUS</th>
                          <th>DESCRIPTION</th>
                          <th>ACTIONS</th>
                        </>
                      )}
                      {productViewType === "services" && (
                        <>
                          <th>SERVICE ID</th>
                          <th>NAME</th>
                          <th>PRICE</th>
                          <th>LOCATION</th>
                          <th>SPECIFIC DRONE</th>
                          <th>EXPERIENCE</th>
                          <th>STATUS</th>
                          <th>DESCRIPTION</th>
                          <th>ACTIONS</th>
                        </>
                      )}
                      {productViewType === "pilots" && (
                        <>
                          <th>PILOT ID</th>
                          <th>NAME</th>
                          <th>COMPANY</th>
                          <th>PRICE/HOUR</th>
                          <th>PRICE/DAY</th>
                          <th>LOCATION</th>
                          <th>STATUS</th>
                          <th>DESCRIPTION</th>
                          <th>EMAIL</th>
                          <th>PHONE</th>
                          <th>SPECIFICATION</th>
                          <th>ACTIONS</th>
                        </>
                      )}
                      {productViewType === "jobs" && (
                        <>
                          <th>JOB ID</th>
                          <th>JOB NAME</th>
                          <th>COMPANY</th>
                          <th>SALARY</th>
                          <th>LOCATION</th>
                          <th>EXPERIENCE</th>
                          <th>STATUS</th>
                          <th>DESCRIPTION</th>
                          <th>JOB TYPE</th>
                          <th>REQUIREMENT</th>
                          <th>ACTIONS</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={getProductId(product)} className={editingRowId === getProductId(product) ? 'editing' : ''}>
                        {renderProductDetails(product)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seller Details Modal */}
      {showModal && selectedSeller && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FaUserCircle /> {selectedSeller.name}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ maxWidth: '600px' }}>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a202c', fontWeight: '700' }}>Basic Information</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Seller ID</strong>
                        <p style={{ margin: 0, color: '#2d3748', fontSize: '14px', fontFamily: 'monospace', fontWeight: 600 }}>{selectedSeller.sellerId}</p>
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Company Name</strong>
                        <p style={{ margin: 0, color: '#2d3748', fontSize: '14px' }}>{selectedSeller.companyName || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a202c', fontWeight: '700' }}>Contact Information</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>
                          <FaEnvelope /> Email
                        </strong>
                        <p style={{ margin: 0, color: '#4299e1', fontSize: '14px', wordBreak: 'break-all' }}>{selectedSeller.email || "N/A"}</p>
                      </div>
                      <div>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>
                          <FaPhone /> Phone
                        </strong>
                        <p style={{ margin: 0, color: '#2d3748', fontSize: '14px' }}>{selectedSeller.phoneNumber || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a202c', fontWeight: '700' }}>Location</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <FaMapMarkerAlt style={{ marginTop: '2px', color: '#4299e1', flexShrink: 0 }} />
                      <p style={{ margin: 0, color: '#2d3748', fontSize: '14px', lineHeight: '1.6' }}>{selectedSeller.address || "N/A"}</p>
                    </div>
                  </div>

                  <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1a202c', fontWeight: '700' }}>Status & Registration</h3>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>Status</strong>
                        <span className={`status-badge status-${selectedSeller.status.toLowerCase()}`}>{selectedSeller.status}</span>
                      </div>
                      <div>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#718096', marginBottom: '4px', textTransform: 'uppercase' }}>
                          <FaCalendarAlt /> Registration Date
                        </strong>
                        <p style={{ margin: 0, color: '#2d3748', fontSize: '14px' }}>{selectedSeller.registrationDate || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}