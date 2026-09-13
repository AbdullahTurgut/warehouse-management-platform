package com.warehouse;

import static com.warehouse.ApiModels.*;
import java.util.UUID;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name="app.seed",havingValue="true")
public class DemoSeed implements CommandLineRunner {
    private final Warehouses warehouses;
    private final Products products;
    private final InventoryService service;
    public DemoSeed(Warehouses warehouses, Products products, InventoryService service) { this.warehouses=warehouses; this.products=products; this.service=service; }
    @Override @Transactional
    public void run(String... args) {
        if(warehouses.count()>0 || products.count()>0) return;
        Warehouse w=service.createWarehouse(new WarehouseInput("WH-01","Ana Depo"));
        var staging=service.createLocation(new LocationInput(w.id,null,Location.Type.STAGING,"RECEIVING","Mal Kabul Alanı"));
        service.createLocation(new LocationInput(w.id,null,Location.Type.STAGING,"DISPATCH","Sevkiyat Bekleme Alanı"));
        var zone=service.createLocation(new LocationInput(w.id,null,Location.Type.ZONE,"A","Genel Depolama"));
        var aisle=service.createLocation(new LocationInput(w.id,zone.id(),Location.Type.AISLE,"A-01","Koridor 01"));
        var rack=service.createLocation(new LocationInput(w.id,aisle.id(),Location.Type.RACK,"A-01-R01","Raf 01"));
        var shelf=service.createLocation(new LocationInput(w.id,rack.id(),Location.Type.SHELF,"A-01-R01-L1","Seviye 1"));
        service.createLocation(new LocationInput(w.id,rack.id(),Location.Type.SHELF,"A-01-R01-L2","Seviye 2"));
        var rack2=service.createLocation(new LocationInput(w.id,aisle.id(),Location.Type.RACK,"A-01-R02","Raf 02"));
        service.createLocation(new LocationInput(w.id,rack2.id(),Location.Type.SHELF,"A-01-R02-L1","Seviye 1"));
        String[][] demo={{"BOX-100","Ambalaj Kolileri","Orta boy oluklu mukavva koliler"},{"TAPE-200","Koli Bandı","Şeffaf koli bandı kolileri"},{"WRAP-300","Streç Film","Palet streç filmi kolileri"},{"GLOVE-400","İş Eldivenleri","Depo iş eldiveni kolileri"}};
        for(int i=0;i<demo.length;i++) {
            Product p=service.createProduct(new ProductInput(demo[i][0],demo[i][1],demo[i][2],true));
            if(i<3) service.receive(new ReceiptInput(p.id,i==0 ? shelf.id() : staging.id(),80-i*20,UUID.randomUUID(),"Örnek başlangıç stok girişi"),"admin");
        }
    }
}
