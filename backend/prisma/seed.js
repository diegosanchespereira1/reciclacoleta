const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Verificar se já existem dados
  const existingUsers = await prisma.user.count();
  const existingCollections = await prisma.collectionItem.count();

  if (existingUsers > 0 || existingCollections > 0) {
    console.log('ℹ️  Banco de dados já contém dados.');
    console.log(`   Usuários: ${existingUsers}`);
    console.log(`   Coletas: ${existingCollections}`);
    console.log('⏭️  Pulando seed para evitar duplicação.');
    console.log('💡 Dica: Para recriar os dados, execute:');
    console.log('   docker exec recicla-backend npx prisma migrate reset');
    return;
  }

  console.log('📝 Banco de dados vazio. Criando dados iniciais...');

  // Limpar dados existentes (opcional - comentar em produção)
  // await prisma.pointsTransaction.deleteMany();
  // await prisma.trackingEvent.deleteMany();
  // await prisma.blockchainRecord.deleteMany();
  // await prisma.collectionItem.deleteMany();
  // await prisma.userPoints.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.collectionPoint.deleteMany();

  // Criar usuários padrão
  const adminPassword = await bcrypt.hash('admin123', 12);
  const collectorPassword = await bcrypt.hash('coletor123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@recicla.com' },
    update: {},
    create: {
      email: 'admin@recicla.com',
      name: 'Administrador',
      password: adminPassword,
      role: 'admin'
    }
  });

  const collector = await prisma.user.upsert({
    where: { email: 'coletor@recicla.com' },
    update: {},
    create: {
      email: 'coletor@recicla.com',
      name: 'João Silva',
      password: collectorPassword,
      role: 'collector'
    }
  });

  // Criar pontos para os usuários
  await prisma.userPoints.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      totalPoints: 0,
      level: 'Administrador'
    }
  });

  await prisma.userPoints.upsert({
    where: { userId: collector.id },
    update: {},
    create: {
      userId: collector.id,
      totalPoints: 250,
      level: 'Iniciante'
    }
  });

  // Criar pontos de coleta
  const point1 = await prisma.collectionPoint.upsert({
    where: { id: 'point-1' },
    update: {},
    create: {
      id: 'point-1',
      name: 'Praça Central',
      address: 'Rua das Flores, 123 - Centro',
      latitude: -23.5505,
      longitude: -46.6333,
      isActive: true
    }
  });

  const point2 = await prisma.collectionPoint.upsert({
    where: { id: 'point-2' },
    update: {},
    create: {
      id: 'point-2',
      name: 'Shopping Mall',
      address: 'Av. Comercial, 456 - Zona Sul',
      latitude: -23.5615,
      longitude: -46.6565,
      isActive: true
    }
  });

  const point3 = await prisma.collectionPoint.upsert({
    where: { id: 'point-3' },
    update: {},
    create: {
      id: 'point-3',
      name: 'Parque Municipal',
      address: 'Rua da Natureza, 789 - Jardins',
      latitude: -23.5686,
      longitude: -46.6932,
      isActive: true
    }
  });

  // Criar algumas coletas de exemplo
  const collection1 = await prisma.collectionItem.create({
    data: {
      type: 'papel',
      weight: 2.5,
      location: 'Praça Central - Lixeira A',
      collectionPointId: point1.id,
      collectionPointName: point1.name,
      collectorId: collector.id,
      collectorName: collector.name,
      status: 'collected',
      qrCode: 'QR-001',
      trackingId: 'TRK-001',
      points: 30 // 2.5 * 10 * 1.2 (bônus papel)
    }
  });

  const collection2 = await prisma.collectionItem.create({
    data: {
      type: 'plastico',
      weight: 1.8,
      location: 'Shopping Mall - Entrada Principal',
      collectionPointId: point2.id,
      collectionPointName: point2.name,
      collectorId: collector.id,
      collectorName: collector.name,
      status: 'collected',
      qrCode: 'QR-002',
      trackingId: 'TRK-002',
      points: 40 // 1.8 * 15 * 1.5 (bônus plástico)
    }
  });

  const collection3 = await prisma.collectionItem.create({
    data: {
      type: 'metal',
      weight: 0.5,
      location: 'Parque Municipal - Área de Lazer',
      collectionPointId: point3.id,
      collectionPointName: point3.name,
      collectorId: collector.id,
      collectorName: collector.name,
      status: 'processing',
      qrCode: 'QR-003',
      trackingId: 'TRK-003',
      points: 20 // 0.5 * 20 * 2.0 (bônus metal)
    }
  });

  // Criar eventos de tracking
  await prisma.trackingEvent.create({
    data: {
      collectionId: collection1.id,
      stage: 'collected',
      location: 'Praça Central - Lixeira A',
      responsiblePerson: collector.name,
      responsiblePersonId: collector.id,
      notes: 'Coleta inicial de papel realizada',
      weight: 2.5
    }
  });

  await prisma.trackingEvent.create({
    data: {
      collectionId: collection2.id,
      stage: 'collected',
      location: 'Shopping Mall - Entrada Principal',
      responsiblePerson: collector.name,
      responsiblePersonId: collector.id,
      notes: 'Coleta inicial de plástico realizada',
      weight: 1.8
    }
  });

  await prisma.trackingEvent.createMany({
    data: [
      {
        collectionId: collection3.id,
        stage: 'collected',
        location: 'Parque Municipal - Área de Lazer',
        responsiblePerson: collector.name,
        responsiblePersonId: collector.id,
        notes: 'Coleta inicial de metal realizada',
        weight: 0.5
      },
      {
        collectionId: collection3.id,
        stage: 'processing',
        location: 'Centro de Processamento',
        responsiblePerson: 'Maria Santos',
        responsiblePersonId: admin.id,
        notes: 'Material enviado para processamento',
        weight: 0.5
      }
    ]
  });

  // Criar transações de pontos
  await prisma.pointsTransaction.createMany({
    data: [
      {
        userId: collector.id,
        collectionId: collection1.id,
        points: 30,
        type: 'earned',
        description: 'Coleta de 2.5kg de papel'
      },
      {
        userId: collector.id,
        collectionId: collection2.id,
        points: 40,
        type: 'earned',
        description: 'Coleta de 1.8kg de plástico'
      },
      {
        userId: collector.id,
        collectionId: collection3.id,
        points: 20,
        type: 'earned',
        description: 'Coleta de 0.5kg de metal'
      }
    ]
  });

  // Criar alguns registros blockchain de exemplo
  await prisma.blockchainRecord.createMany({
    data: [
      {
        hash: 'bc001',
        previousHash: '0',
        collectionId: collection1.id,
        eventId: 'evt001',
        stage: 'collected',
        weight: 2.5,
        location: 'Praça Central',
        responsiblePerson: collector.name,
        nonce: 12345
      },
      {
        hash: 'bc002',
        previousHash: 'bc001',
        collectionId: collection2.id,
        eventId: 'evt002',
        stage: 'collected',
        weight: 1.8,
        location: 'Shopping Mall',
        responsiblePerson: collector.name,
        nonce: 23456
      }
    ]
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('👤 Usuários criados:');
  console.log(`   Admin: admin@recicla.com / admin123`);
  console.log(`   Coletor: coletor@recicla.com / coletor123`);
  console.log('📍 Pontos de coleta: 3');
  console.log('📦 Coletas de exemplo: 3');
  console.log('🔗 Registros blockchain: 2');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
