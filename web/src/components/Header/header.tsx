"use client";

import React, { useContext } from "react";
import { LanguageContext } from "../../hooks/LanguageContext"; // ენის კონტექსტი
import Image from "next/image"; // Next.js-ის Image კომპონენტი
import geoFlag from "../../assets/geoFlag.png"; // ქართული დროშა
import engFlag from "../../assets/engFlag.png"; // ინგლისური დროშა
import "./header.css"; // სტილები

const Header: React.FC = () => {
  const { language, setLanguage } = useContext(LanguageContext); // ენის კონტროლი

  const handleLangClick = () => {
    const newLanguage = language === "ge" ? "en" : "ge"; // ენების გადართვა
    setLanguage(newLanguage); // ახალი ენის დაყენება
  };

  return (
    <header className="header">
      {/* ლოგო */}
      <div className="header__logo">FishHunt</div>

      {/* საძიებო ველი */}
      <div className="header__search">
        <input
          type="text"
          placeholder="Search products..."
          className="header__input"
        />
        <button className="header__icon">🔍</button>
      </div>

      {/* მოქმედებები */}
      <div className="header__actions">
        <Image
          src={language === "ge" ? engFlag : geoFlag}
          alt={language === "ge" ? "English Flag" : "Georgian Flag"}
          width={35}
          height={25}
          onClick={handleLangClick}
          className="header__lang"
        />
        <button className="header__icon">🛒</button>
        <button className="header__icon">
          👤 <span> Sign In</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
