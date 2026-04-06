-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 05, 2026 at 07:36 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `clothing_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`) VALUES
(1, 'admin', 'admin123'),
(2, 'sahanmi', '1234'),
(3, 'admin2', '1234');

-- --------------------------------------------------------

--
-- Table structure for table `work_orders`
--

CREATE TABLE `work_orders` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `item_type` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `order_date` date DEFAULT NULL,
  `deadline` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `measurements` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `work_orders`
--

INSERT INTO `work_orders` (`id`, `customer_name`, `phone`, `item_type`, `status`, `order_date`, `deadline`, `notes`, `measurements`) VALUES
(1, 'Rahul Sharma', '9876543210', 'Shirt', 'Done', '2026-04-05', '2026-04-10', 'Slim fit, blue color stitching', NULL),
(6, 'Arjun Kumar', '9976543210', 'Shirt', 'Done', '2026-04-05', '2026-04-11', 'Slim fit, light blue color, office wear', 'Chest: 40, Waist: 32, Sleeve: 24, Length: 28'),
(8, 'Arjun Kumar', '9976543210', 'Shirt', 'Done', '2026-04-05', '2026-04-10', 'Slim fit, light blue color, office wear', 'Chest: 40, Waist: 32, Sleeve: 24, Length: 28'),
(9, 'Priya Patel', '9123456780', 'Dress', 'Done', '2026-04-05', '2026-04-15', 'Party wear, floral design, long sleeve', 'Bust: 36, Waist: 28, Length: 50'),
(10, 'Rahul Sharma', '9012345678', 'Pant', 'Pending', '2026-04-05', '2026-04-18', 'Formal black pant, slim fit', 'Waist: 32, Length: 40, Hip: 38'),
(11, 'Neha Singh', '8899776655', 'Dress', 'Pending', '2026-04-05', '2026-04-20', '', 'Bust: 34, Waist: 26, Shoulder: 14, Length: 48');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `work_orders`
--
ALTER TABLE `work_orders`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `work_orders`
--
ALTER TABLE `work_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
